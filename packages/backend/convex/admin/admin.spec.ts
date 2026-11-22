import { AuditAction, ErrorCode, LoanStatus, Role, todayUtc } from '@lendloop/contracts';
import { describe, expect, it } from 'vitest';

import { drill, insertLoan, userIdByEmail } from '../../test/fixtures';
import { setup, signUp } from '../../test/harness';
import { api, internal } from '../_generated/api';

const today = todayUtc();
const admin = { subject: 'admin', email: 'admin@example.com', name: 'Ada' };
const owner = { subject: 'owner', email: 'owner@example.com', name: 'Olga' };
const borrower = { subject: 'borrower', email: 'borrower@example.com', name: 'Bob' };

async function world() {
  const t = setup();
  const asAdmin = await signUp(t, admin);
  await t.mutation(internal.users.internal.setRole, { email: admin.email, role: Role.ADMIN });
  const asOwner = await signUp(t, owner);
  await signUp(t, borrower);
  const toolId = await asOwner.mutation(api.tools.mutations.create, drill);
  const borrowerId = await userIdByEmail(t, borrower.email);
  const ownerId = await userIdByEmail(t, owner.email);
  return { t, asAdmin, asOwner, toolId, borrowerId, ownerId };
}

describe('admin access', () => {
  it('refuses every admin function to regular users', async () => {
    const { asOwner, toolId, ownerId } = await world();
    const forbidden = { data: { code: ErrorCode.FORBIDDEN } };
    await expect(asOwner.query(api.admin.queries.loans, { today })).rejects.toMatchObject(
      forbidden,
    );
    await expect(asOwner.query(api.admin.queries.users, {})).rejects.toMatchObject(forbidden);
    await expect(asOwner.query(api.admin.queries.tools, { today })).rejects.toMatchObject(
      forbidden,
    );
    await expect(
      asOwner.mutation(api.admin.mutations.removeTool, { toolId }),
    ).rejects.toMatchObject(forbidden);
    await expect(
      asOwner.mutation(api.admin.mutations.setTrusted, { userId: ownerId, isTrustedLender: true }),
    ).rejects.toMatchObject(forbidden);
  });

  it('records a CLI role change once, and nothing when the role stays the same', async () => {
    const { t } = await world();
    await t.mutation(internal.users.internal.setRole, { email: admin.email, role: Role.ADMIN });
    const entries = await t.run((ctx) => ctx.db.query('auditLog').collect());
    const roleChanges = entries.filter((entry) => entry.action === AuditAction.USER_ROLE_CHANGED);
    expect(roleChanges).toHaveLength(1);
  });
});

describe('admin.queries.loans', () => {
  it('shows every loan with names only and filters by status', async () => {
    const { t, asAdmin, toolId, borrowerId } = await world();
    await insertLoan(t, { toolId, borrowerId, startDate: '2099-01-01', endDate: '2099-01-02' });
    await insertLoan(t, {
      toolId,
      borrowerId,
      startDate: '2020-01-01',
      endDate: '2020-01-02',
      status: LoanStatus.APPROVED,
    });
    const { items: all, isTruncated } = await asAdmin.query(api.admin.queries.loans, { today });
    expect(isTruncated).toBe(false);
    expect(all).toHaveLength(2);
    expect(all[0]).toMatchObject({ toolName: drill.name, ownerName: 'Olga', borrowerName: 'Bob' });
    expect(JSON.stringify(all)).not.toMatch(/@example\.com/);
    const { items: approved } = await asAdmin.query(api.admin.queries.loans, {
      today,
      status: LoanStatus.APPROVED,
    });
    expect(approved).toEqual([expect.objectContaining({ isOverdue: true })]);
  });
});

describe('admin.mutations', () => {
  it('removes any listing, cancels its open requests and records the admin', async () => {
    const { t, asAdmin, asOwner, toolId, borrowerId } = await world();
    const loanId = await insertLoan(t, {
      toolId,
      borrowerId,
      startDate: '2099-01-01',
      endDate: '2099-01-02',
    });
    await asAdmin.mutation(api.admin.mutations.removeTool, { toolId });
    expect(await asOwner.query(api.tools.queries.get, { today, toolId })).toBeNull();
    expect((await t.run((ctx) => ctx.db.get('loans', loanId)))?.status).toBe(LoanStatus.CANCELLED);
    const adminId = await userIdByEmail(t, admin.email);
    const removal = await t.run((ctx) =>
      ctx.db
        .query('auditLog')
        .withIndex('by_actor', (q) => q.eq('actorId', adminId))
        .collect(),
    );
    expect(removal).toEqual([
      expect.objectContaining({ action: AuditAction.TOOL_REMOVED_BY_ADMIN, toolId }),
    ]);
  });

  it('refuses to remove a tool that is out on loan', async () => {
    const { t, asAdmin, toolId, borrowerId } = await world();
    await insertLoan(t, {
      toolId,
      borrowerId,
      startDate: today,
      endDate: today,
      status: LoanStatus.APPROVED,
    });
    await expect(
      asAdmin.mutation(api.admin.mutations.removeTool, { toolId }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.CONFLICT } });
  });

  it('marks a lender as trusted, which every tool card then shows', async () => {
    const { asAdmin, asOwner, toolId, ownerId } = await world();
    await asAdmin.mutation(api.admin.mutations.setTrusted, {
      userId: ownerId,
      isTrustedLender: true,
    });
    const card = await asOwner.query(api.tools.queries.get, { today, toolId });
    expect(card?.lender.isTrustedLender).toBe(true);
    const { items: users } = await asAdmin.query(api.admin.queries.users, {});
    expect(users.find((user) => user.id === ownerId)).toMatchObject({
      isTrustedLender: true,
      activeListings: 1,
    });
  });

  it('lists every active listing for removal', async () => {
    const { asAdmin, toolId } = await world();
    const { items, isTruncated } = await asAdmin.query(api.admin.queries.tools, { today });
    expect(isTruncated).toBe(false);
    expect(items.map((tool) => tool.id)).toEqual([toolId]);
  });
});
