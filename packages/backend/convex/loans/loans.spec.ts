import {
  AuditAction,
  ErrorCode,
  LoanAction,
  LoanStatus,
  MAX_OPEN_REQUESTS_PER_BORROWER,
  Role,
  todayUtc,
} from '@lendloop/contracts';
import { describe, expect, it } from 'vitest';

import { drill, insertLoan, userIdByEmail } from '../../test/fixtures';
import { setup, signUp } from '../../test/harness';
import { api, internal } from '../_generated/api';

import type { Id } from '../_generated/dataModel';

const DAY = 86_400_000;
const day = (offset: number) => todayUtc(Date.now() + offset * DAY);
const today = day(0);

const owner = { subject: 'owner', email: 'owner@example.com', name: 'Olga' };
const borrower = { subject: 'borrower', email: 'borrower@example.com', name: 'Bob' };
const other = { subject: 'other', email: 'other@example.com', name: 'Oscar' };

async function world() {
  const t = setup();
  const asOwner = await signUp(t, owner);
  const asBorrower = await signUp(t, borrower);
  const asOther = await signUp(t, other);
  const toolId = await asOwner.mutation(api.tools.mutations.create, drill);
  const request = (client: typeof asBorrower, from: number, to: number) =>
    client.mutation(api.loans.mutations.request, {
      toolId,
      startDate: day(from),
      endDate: day(to),
    });
  const status = (loanId: Id<'loans'>) =>
    t.run(async (ctx) => (await ctx.db.get('loans', loanId))?.status);
  return { t, asOwner, asBorrower, asOther, toolId, request, status };
}

describe('loans.request', () => {
  it('creates a request the owner sees as incoming and the borrower as theirs', async () => {
    const { asOwner, asBorrower, request } = await world();
    const loanId = await request(asBorrower, 1, 3);
    const [incoming] = await asOwner.query(api.loans.queries.incoming, { today });
    expect(incoming).toMatchObject({
      id: loanId,
      status: LoanStatus.REQUESTED,
      counterpart: { name: 'Bob' },
      actions: [LoanAction.APPROVE, LoanAction.DECLINE],
    });
    const [mine] = await asBorrower.query(api.loans.queries.mine, { today });
    expect(mine).toMatchObject({ counterpart: { name: 'Olga' }, actions: [LoanAction.CANCEL] });
    expect(JSON.stringify([incoming, mine])).not.toMatch(/@example\.com/);
  });

  it('refuses to lend a tool to its owner', async () => {
    const { asOwner, request } = await world();
    await expect(request(asOwner, 1, 2)).rejects.toMatchObject({
      data: { code: ErrorCode.VALIDATION_FAILED },
    });
  });

  it('refuses dates in the past, reversed ranges and loans that are too long', async () => {
    const { asBorrower, request } = await world();
    await expect(request(asBorrower, -1, 1)).rejects.toMatchObject({
      data: { code: ErrorCode.VALIDATION_FAILED },
    });
    await expect(request(asBorrower, 3, 1)).rejects.toThrow();
    await expect(request(asBorrower, 1, 40)).rejects.toThrow();
  });

  it('refuses days already booked by an approved loan', async () => {
    const { asOwner, asBorrower, asOther, request } = await world();
    const loanId = await request(asBorrower, 1, 3);
    await asOwner.mutation(api.loans.mutations.act, { loanId, action: LoanAction.APPROVE });
    await expect(request(asOther, 3, 5)).rejects.toMatchObject({
      data: { code: ErrorCode.CONFLICT },
    });
    await expect(request(asOther, 4, 5)).resolves.toBeDefined();
  });

  it('refuses a second overlapping request from the same borrower', async () => {
    const { asBorrower, request } = await world();
    await request(asBorrower, 1, 3);
    await expect(request(asBorrower, 2, 4)).rejects.toMatchObject({
      data: { code: ErrorCode.CONFLICT },
    });
  });

  it(`caps open requests at ${String(MAX_OPEN_REQUESTS_PER_BORROWER)} per borrower`, async () => {
    const { asBorrower, request } = await world();
    for (let i = 0; i < MAX_OPEN_REQUESTS_PER_BORROWER; i += 1) {
      await request(asBorrower, i * 2 + 1, i * 2 + 1);
    }
    await expect(request(asBorrower, 60, 60)).rejects.toMatchObject({
      data: { code: ErrorCode.RATE_LIMITED },
    });
  });

  it('refuses guests', async () => {
    const { t, toolId } = await world();
    await expect(
      t.mutation(api.loans.mutations.request, { toolId, startDate: day(1), endDate: day(2) }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.UNAUTHENTICATED } });
  });
});

describe('loans.act', () => {
  it('approves, auto-declines overlapping requests and records both', async () => {
    const { t, asOwner, asBorrower, asOther, request, status } = await world();
    const chosen = await request(asBorrower, 1, 3);
    const competing = await request(asOther, 2, 4);
    const elsewhere = await request(asOther, 5, 6);
    await asOwner.mutation(api.loans.mutations.act, { loanId: chosen, action: LoanAction.APPROVE });
    expect(await status(chosen)).toBe(LoanStatus.APPROVED);
    expect(await status(competing)).toBe(LoanStatus.DECLINED);
    expect(await status(elsewhere)).toBe(LoanStatus.REQUESTED);
    const audit = await t.run((ctx) =>
      ctx.db
        .query('auditLog')
        .withIndex('by_loan', (q) => q.eq('loanId', competing))
        .collect(),
    );
    expect(audit.map((entry) => entry.action)).toEqual([
      AuditAction.LOAN_REQUESTED,
      AuditAction.LOAN_AUTO_DECLINED,
    ]);
  });

  it('lets the owner decline and the borrower cancel', async () => {
    const { asOwner, asBorrower, request, status } = await world();
    const declined = await request(asBorrower, 1, 1);
    await asOwner.mutation(api.loans.mutations.act, {
      loanId: declined,
      action: LoanAction.DECLINE,
    });
    expect(await status(declined)).toBe(LoanStatus.DECLINED);
    const cancelled = await request(asBorrower, 2, 2);
    await asBorrower.mutation(api.loans.mutations.act, {
      loanId: cancelled,
      action: LoanAction.CANCEL,
    });
    expect(await status(cancelled)).toBe(LoanStatus.CANCELLED);
  });

  it('keeps each action to its party', async () => {
    const { asOwner, asBorrower, request } = await world();
    const loanId = await request(asBorrower, 1, 2);
    await expect(
      asBorrower.mutation(api.loans.mutations.act, { loanId, action: LoanAction.APPROVE }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.FORBIDDEN } });
    await expect(
      asOwner.mutation(api.loans.mutations.act, { loanId, action: LoanAction.CANCEL }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.FORBIDDEN } });
  });

  it('hides loans from people who are not on them, admins included', async () => {
    const { t, asBorrower, asOther, request } = await world();
    const loanId = await request(asBorrower, 1, 2);
    await t.mutation(internal.users.internal.setRole, { email: other.email, role: Role.ADMIN });
    await expect(
      asOther.mutation(api.loans.mutations.act, { loanId, action: LoanAction.APPROVE }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.NOT_FOUND } });
  });

  it('approves a request for today', async () => {
    const { asOwner, asBorrower, request, status } = await world();
    const loanId = await request(asBorrower, 0, 1);
    await asOwner.mutation(api.loans.mutations.act, { loanId, action: LoanAction.APPROVE });
    expect(await status(loanId)).toBe(LoanStatus.APPROVED);
  });

  it('refuses to approve a request whose first day has passed', async () => {
    const { t, asOwner, toolId, status } = await world();
    const borrowerId = await userIdByEmail(t, borrower.email);
    const loanId = await insertLoan(t, { toolId, borrowerId, startDate: day(-1), endDate: day(2) });
    await expect(
      asOwner.mutation(api.loans.mutations.act, { loanId, action: LoanAction.APPROVE }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.INVALID_TRANSITION } });
    expect(await status(loanId)).toBe(LoanStatus.REQUESTED);
  });

  it('lets the owner mark an approved loan returned, once', async () => {
    const { t, asOwner, toolId, status } = await world();
    const borrowerId = await userIdByEmail(t, borrower.email);
    const loanId = await insertLoan(t, {
      toolId,
      borrowerId,
      startDate: day(-3),
      endDate: day(-1),
      status: LoanStatus.APPROVED,
    });
    const [late] = await asOwner.query(api.loans.queries.incoming, { today });
    expect(late).toMatchObject({ isOverdue: true, actions: [LoanAction.MARK_RETURNED] });
    await asOwner.mutation(api.loans.mutations.act, { loanId, action: LoanAction.MARK_RETURNED });
    expect(await status(loanId)).toBe(LoanStatus.RETURNED);
    await expect(
      asOwner.mutation(api.loans.mutations.act, { loanId, action: LoanAction.MARK_RETURNED }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.INVALID_TRANSITION } });
  });

  it('refuses to mark a loan returned before it has started', async () => {
    const { asOwner, asBorrower, request } = await world();
    const loanId = await request(asBorrower, 2, 3);
    await asOwner.mutation(api.loans.mutations.act, { loanId, action: LoanAction.APPROVE });
    await expect(
      asOwner.mutation(api.loans.mutations.act, { loanId, action: LoanAction.MARK_RETURNED }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.INVALID_TRANSITION } });
  });

  it('lets the borrower cancel an approved loan until its first day but not after', async () => {
    const { t, asOwner, asBorrower, toolId, request, status } = await world();
    const future = await request(asBorrower, 2, 3);
    await asOwner.mutation(api.loans.mutations.act, { loanId: future, action: LoanAction.APPROVE });
    await asBorrower.mutation(api.loans.mutations.act, {
      loanId: future,
      action: LoanAction.CANCEL,
    });
    expect(await status(future)).toBe(LoanStatus.CANCELLED);
    const borrowerId = await userIdByEmail(t, borrower.email);
    const started = await insertLoan(t, {
      toolId,
      borrowerId,
      startDate: day(-1),
      endDate: day(1),
      status: LoanStatus.APPROVED,
    });
    await expect(
      asBorrower.mutation(api.loans.mutations.act, { loanId: started, action: LoanAction.CANCEL }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.INVALID_TRANSITION } });
  });

  it('refuses to cancel an approved loan on its first day, when the tool may have changed hands', async () => {
    const { t, asBorrower, toolId, status } = await world();
    const borrowerId = await userIdByEmail(t, borrower.email);
    const loanId = await insertLoan(t, {
      toolId,
      borrowerId,
      startDate: today,
      endDate: day(2),
      status: LoanStatus.APPROVED,
    });
    await expect(
      asBorrower.mutation(api.loans.mutations.act, { loanId, action: LoanAction.CANCEL }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.INVALID_TRANSITION } });
    expect(await status(loanId)).toBe(LoanStatus.APPROVED);
  });

  it('accepts no system actions from clients', async () => {
    const { asOwner, asBorrower, request } = await world();
    const loanId = await request(asBorrower, 1, 2);
    await expect(
      asOwner.mutation(api.loans.mutations.act, {
        loanId,
        action: LoanAction.AUTO_DECLINE as never,
      }),
    ).rejects.toThrow();
  });
});

describe('loans.internal.expireStale', () => {
  it('declines unanswered requests whose first day has passed and frees the borrower', async () => {
    const { t, asBorrower, toolId, request, status } = await world();
    const borrowerId = await userIdByEmail(t, borrower.email);
    const stale = await Promise.all(
      Array.from({ length: MAX_OPEN_REQUESTS_PER_BORROWER }, (_, i) =>
        insertLoan(t, { toolId, borrowerId, startDate: day(-2 - i), endDate: day(-1) }),
      ),
    );
    await expect(request(asBorrower, 1, 1)).resolves.toBeDefined();
    const fresh = await request(asBorrower, 2, 2);
    expect(await t.mutation(internal.loans.internal.expireStale, {})).toEqual({
      expired: MAX_OPEN_REQUESTS_PER_BORROWER,
    });
    await t.finishAllScheduledFunctions(() => undefined);
    expect(await status(stale[0] as Id<'loans'>)).toBe(LoanStatus.DECLINED);
    expect(await status(fresh)).toBe(LoanStatus.REQUESTED);
  });
});
