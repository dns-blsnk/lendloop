import {
  AuditAction,
  Availability,
  ErrorCode,
  LoanStatus,
  todayUtc,
  ToolCategory,
} from '@lendloop/contracts';
import { describe, expect, it } from 'vitest';

import { insertLoan, drill, userIdByEmail } from '../../test/fixtures';
import { setup, signUp } from '../../test/harness';
import { api } from '../_generated/api';

import type { TestConvex } from '../../test/harness';

const owner = { subject: 'owner', email: 'owner@example.com', name: 'Olga' };
const neighbour = { subject: 'neighbour', email: 'neighbour@example.com', name: 'Nick' };
const today = todayUtc();

async function world() {
  const t = setup();
  const asOwner = await signUp(t, owner);
  const asNeighbour = await signUp(t, neighbour);
  const toolId = await asOwner.mutation(api.tools.mutations.create, drill);
  return { t, asOwner, asNeighbour, toolId };
}

function lendNow(t: TestConvex, toolId: Parameters<typeof insertLoan>[1]['toolId']) {
  return userIdByEmail(t, neighbour.email).then((borrowerId) =>
    insertLoan(t, {
      toolId,
      borrowerId,
      startDate: today,
      endDate: today,
      status: LoanStatus.APPROVED,
    }),
  );
}

describe('tools.create', () => {
  it('lists the tool as the caller and records who did it', async () => {
    const { t, asOwner, toolId } = await world();
    const card = await asOwner.query(api.tools.queries.get, { today, toolId });
    expect(card).toMatchObject({
      name: drill.name,
      isMine: true,
      availability: Availability.AVAILABLE,
    });
    const audit = await t.run((ctx) => ctx.db.query('auditLog').collect());
    expect(audit).toEqual([expect.objectContaining({ action: AuditAction.TOOL_CREATED, toolId })]);
  });

  it('rejects guests', async () => {
    const { t } = await world();
    await expect(t.mutation(api.tools.mutations.create, drill)).rejects.toMatchObject({
      data: { code: ErrorCode.UNAUTHENTICATED },
    });
  });

  it('rejects invalid fields on the server too', async () => {
    const { asOwner } = await world();
    await expect(
      asOwner.mutation(api.tools.mutations.create, { ...drill, name: ' ' }),
    ).rejects.toThrow();
  });
});

describe('tools.update and tools.remove', () => {
  it('lets the owner edit their listing', async () => {
    const { asOwner, toolId } = await world();
    await asOwner.mutation(api.tools.mutations.update, { toolId, ...drill, name: 'Hammer drill' });
    expect((await asOwner.query(api.tools.queries.get, { today, toolId }))?.name).toBe(
      'Hammer drill',
    );
  });

  it('refuses edits and deletes from someone else', async () => {
    const { asNeighbour, toolId } = await world();
    await expect(
      asNeighbour.mutation(api.tools.mutations.update, { toolId, ...drill }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.FORBIDDEN } });
    await expect(
      asNeighbour.mutation(api.tools.mutations.remove, { toolId }),
    ).rejects.toMatchObject({
      data: { code: ErrorCode.FORBIDDEN },
    });
  });

  it('hides a deleted listing and cancels its open requests', async () => {
    const { t, asOwner, toolId } = await world();
    const borrowerId = await userIdByEmail(t, neighbour.email);
    const loanId = await insertLoan(t, {
      toolId,
      borrowerId,
      startDate: '2099-01-01',
      endDate: '2099-01-02',
    });
    await asOwner.mutation(api.tools.mutations.remove, { toolId });
    expect(await asOwner.query(api.tools.queries.get, { today, toolId })).toBeNull();
    const loan = await t.run((ctx) => ctx.db.get('loans', loanId));
    expect(loan?.status).toBe(LoanStatus.CANCELLED);
  });

  it('cancels approved loans that have not started and records each withdrawal', async () => {
    const { t, asOwner, toolId } = await world();
    const borrowerId = await userIdByEmail(t, neighbour.email);
    const loanId = await insertLoan(t, {
      toolId,
      borrowerId,
      startDate: '2099-01-01',
      endDate: '2099-01-02',
      status: LoanStatus.APPROVED,
    });
    await asOwner.mutation(api.tools.mutations.remove, { toolId });
    const loan = await t.run((ctx) => ctx.db.get('loans', loanId));
    expect(loan?.status).toBe(LoanStatus.CANCELLED);
    const withdrawn = await t.run((ctx) =>
      ctx.db
        .query('auditLog')
        .withIndex('by_loan', (q) => q.eq('loanId', loanId))
        .collect(),
    );
    expect(withdrawn).toEqual([
      expect.objectContaining({ action: AuditAction.LOAN_WITHDRAWN, actorId: 'system' }),
    ]);
  });

  it('refuses to delete an overdue tool and leaves everything as it was', async () => {
    const { t, asOwner, toolId } = await world();
    const borrowerId = await userIdByEmail(t, neighbour.email);
    await insertLoan(t, {
      toolId,
      borrowerId,
      startDate: '2020-01-01',
      endDate: '2020-01-02',
      status: LoanStatus.APPROVED,
    });
    await expect(asOwner.mutation(api.tools.mutations.remove, { toolId })).rejects.toMatchObject({
      data: { code: ErrorCode.CONFLICT },
    });
    const card = await asOwner.query(api.tools.queries.get, { today, toolId });
    expect(card?.availability).toBe(Availability.OVERDUE);
  });

  it('refuses to delete a tool that is out on loan', async () => {
    const { t, asOwner, toolId } = await world();
    await lendNow(t, toolId);
    await expect(asOwner.mutation(api.tools.mutations.remove, { toolId })).rejects.toMatchObject({
      data: { code: ErrorCode.CONFLICT },
    });
  });
});

describe('tool lists', () => {
  it('shows guests only name, category and a key, and only tools free today', async () => {
    const { t, asOwner, toolId } = await world();
    const ladderId = await asOwner.mutation(api.tools.mutations.create, {
      ...drill,
      name: 'Ladder',
      category: ToolCategory.LADDERS,
    });
    await lendNow(t, toolId);
    const rows = await t.query(api.tools.queries.listPublic, { today });
    expect(rows).toEqual([{ id: ladderId, name: 'Ladder', category: ToolCategory.LADDERS }]);
  });

  it('shows signed-in users every tool with availability and the lender, but no email', async () => {
    const { t, asNeighbour, toolId } = await world();
    await lendNow(t, toolId);
    const [card] = await asNeighbour.query(api.tools.queries.list, { today });
    expect(card).toMatchObject({
      availability: Availability.ON_LOAN,
      lender: { name: 'Olga', isTrustedLender: false },
      isMine: false,
    });
    expect(JSON.stringify(card)).not.toContain(owner.email);
  });

  it('filters by category', async () => {
    const { asNeighbour } = await world();
    expect(
      await asNeighbour.query(api.tools.queries.list, { today, category: ToolCategory.GARDEN }),
    ).toEqual([]);
    expect(
      await asNeighbour.query(api.tools.queries.list, {
        today,
        category: ToolCategory.POWER_TOOLS,
      }),
    ).toHaveLength(1);
  });

  it('lists only the viewer’s own tools under mine', async () => {
    const { asOwner, asNeighbour } = await world();
    expect(await asOwner.query(api.tools.queries.mine, { today })).toHaveLength(1);
    expect(await asNeighbour.query(api.tools.queries.mine, { today })).toEqual([]);
  });

  it('requires sign-in for the full list', async () => {
    const { t } = await world();
    await expect(t.query(api.tools.queries.list, { today })).rejects.toMatchObject({
      data: { code: ErrorCode.UNAUTHENTICATED },
    });
  });
});
