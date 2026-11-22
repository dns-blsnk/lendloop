import {
  DeliveryStatus,
  ErrorCode,
  LoanStatus,
  Role,
  reminderKey,
  todayUtc,
} from '@lendloop/contracts';
import { describe, expect, it } from 'vitest';

import { drill, insertLoan, userIdByEmail } from '../../test/fixtures';
import { setup, signUp } from '../../test/harness';
import { api, internal } from '../_generated/api';

import type { Id } from '../_generated/dataModel';

const today = todayUtc();
const admin = { subject: 'admin', email: 'admin@example.com', name: 'Ada' };
const owner = { subject: 'owner', email: 'owner@example.com', name: 'Olga' };
const borrower = { subject: 'borrower', email: 'borrower@example.com', name: 'Bob' };

async function world() {
  const t = setup();
  const asAdmin = await signUp(t, admin);
  await t.mutation(internal.users.internal.setRole, { email: admin.email, role: Role.ADMIN });
  const asOwner = await signUp(t, owner);
  const asBorrower = await signUp(t, borrower);
  const toolId = await asOwner.mutation(api.tools.mutations.create, drill);
  const loanId = await insertLoan(t, {
    toolId,
    borrowerId: await userIdByEmail(t, borrower.email),
    startDate: '2020-01-01',
    endDate: '2020-01-02',
    status: LoanStatus.APPROVED,
  });
  return { t, asAdmin, asOwner, asBorrower, loanId };
}

describe('loan activity', () => {
  it('shows what the automation did on the loan to both parties', async () => {
    const { t, asOwner, asBorrower, loanId } = await world();
    await t.mutation(internal.automation.n8n.reminderResult, {
      loanId,
      reminderKey: reminderKey(loanId, today),
      status: DeliveryStatus.SENT,
    });
    const [incoming] = await asOwner.query(api.loans.queries.incoming, { today });
    const [mine] = await asBorrower.query(api.loans.queries.mine, { today });
    for (const view of [incoming, mine]) {
      expect(view?.activity).toEqual([
        expect.objectContaining({ kind: 'reminder', status: DeliveryStatus.SENT }),
      ]);
    }
  });
});

describe('admin automation health', () => {
  it('is for admins only', async () => {
    const { asOwner } = await world();
    await expect(asOwner.query(api.admin.queries.automation, {})).rejects.toMatchObject({
      data: { code: ErrorCode.FORBIDDEN },
    });
  });

  it('reports the heartbeat, failed events and workflow errors', async () => {
    const { t, asAdmin, loanId } = await world();
    expect(
      (await asAdmin.query(api.admin.queries.automation, {})).overdueWorkflow.lastRunAt,
    ).toBeNull();
    await t.mutation(internal.automation.n8n.overdueLoans, {});
    await t.mutation(internal.automation.n8n.workflowError, {
      executionId: '7',
      workflow: 'LendLoop – Overdue reminders',
      message: 'SMTP down',
    });
    const recipientId = await userIdByEmail(t, borrower.email);
    await t.run((ctx) =>
      ctx.db.insert('outboundEvents', {
        type: 'loan.approved',
        loanId,
        recipientId,
        snapshot: {
          toolName: 'Drill',
          startDate: today,
          endDate: today,
          status: LoanStatus.APPROVED,
        },
        status: 'failed',
        attempts: 5,
        nextAttemptAt: 0,
        lastError: 'n8n answered HTTP 503.',
      }),
    );
    const health = await asAdmin.query(api.admin.queries.automation, {});
    expect(health.overdueWorkflow.lastRunAt).not.toBeNull();
    expect(health.failedEvents).toEqual([
      expect.objectContaining({ attempts: 5, lastError: 'n8n answered HTTP 503.' }),
    ]);
    expect(health.workflowErrors).toEqual([expect.objectContaining({ message: 'SMTP down' })]);
    expect(health.pendingEvents).toEqual({ count: 0, isCapped: false });
  });

  it('lets an admin send a failed notification again, and only a failed one', async () => {
    const { t, asAdmin, asBorrower } = await world();
    const [tool] = await t.run((ctx) => ctx.db.query('tools').collect());
    await asBorrower.mutation(api.loans.mutations.request, {
      toolId: tool?._id as Id<'tools'>,
      startDate: todayUtc(Date.now() + 86_400_000 * 3),
      endDate: todayUtc(Date.now() + 86_400_000 * 3),
    });
    const [event] = await t.run((ctx) => ctx.db.query('outboundEvents').collect());
    const eventId = event?._id as Id<'outboundEvents'>;
    await expect(
      asAdmin.mutation(api.admin.mutations.retryNotification, { eventId }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.CONFLICT } });
    await t.run((ctx) =>
      ctx.db.patch('outboundEvents', eventId, { status: 'failed', attempts: 5 }),
    );
    await asAdmin.mutation(api.admin.mutations.retryNotification, { eventId });
    const retried = await t.run((ctx) => ctx.db.get('outboundEvents', eventId));
    expect(retried).toMatchObject({ status: 'pending', attempts: 0 });
  });

  it('refuses to send again an event whose recipient is gone', async () => {
    const { t, asAdmin, loanId } = await world();
    const recipientId = await userIdByEmail(t, borrower.email);
    const eventId = await t.run((ctx) =>
      ctx.db.insert('outboundEvents', {
        type: 'loan.approved',
        loanId,
        recipientId,
        snapshot: {
          toolName: 'Drill',
          startDate: today,
          endDate: today,
          status: LoanStatus.APPROVED,
        },
        status: 'failed',
        attempts: 1,
        nextAttemptAt: 0,
        lastError: 'The recipient no longer exists.',
      }),
    );
    await expect(
      asAdmin.mutation(api.admin.mutations.retryNotification, { eventId }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.CONFLICT } });
  });
});
