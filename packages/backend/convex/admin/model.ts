import {
  AuditAction,
  ErrorCode,
  FORMER_NEIGHBOUR_NAME,
  MAX_ADMIN_LOANS,
  MAX_ADMIN_USERS,
  MAX_COUNTED_LISTINGS,
  REMOVED_TOOL_NAME,
  todayUtc,
  ToolStatus,
} from '@lendloop/contracts';

import { recordAudit } from '../audit';
import { isOverdue } from '../domain/availability';
import { domainError } from '../lib/errors';

import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { AdminLoan, AdminUser, IsoDate, LoanStatus } from '@lendloop/contracts';

interface Capped<Item> {
  items: Item[];
  isTruncated: boolean;
}

/** Reads one row more than the cap to know whether the list was cut. */
function capped<Item>(rows: Item[], max: number): Capped<Item> {
  return { items: rows.slice(0, max), isTruncated: rows.length > max };
}

async function namesById<Row extends { _id: string; name: string }>(
  ids: Iterable<Row['_id']>,
  load: (id: Row['_id']) => Promise<Row | null>,
): Promise<Map<Row['_id'], string>> {
  const unique = [...new Set(ids)];
  const rows = await Promise.all(unique.map(load));
  return new Map(rows.flatMap((row) => (row === null ? [] : [[row._id, row.name] as const])));
}

/** Every loan, newest first, optionally of one status. */
export async function listAllLoans(
  ctx: QueryCtx,
  options: { status: LoanStatus | undefined; today: IsoDate },
): Promise<Capped<AdminLoan & { id: Id<'loans'> }>> {
  const { status, today } = options;
  const query =
    status === undefined
      ? ctx.db.query('loans')
      : ctx.db.query('loans').withIndex('by_status', (q) => q.eq('status', status));
  const { items: loans, isTruncated } = capped(
    await query.order('desc').take(MAX_ADMIN_LOANS + 1),
    MAX_ADMIN_LOANS,
  );
  const [people, tools] = await Promise.all([
    namesById<Doc<'users'>>(
      loans.flatMap((loan) => [loan.ownerId, loan.borrowerId]),
      (id) => ctx.db.get('users', id),
    ),
    namesById<Doc<'tools'>>(
      loans.map((loan) => loan.toolId),
      (id) => ctx.db.get('tools', id),
    ),
  ]);
  const items = loans.map((loan) => ({
    id: loan._id,
    status: loan.status,
    startDate: loan.startDate,
    endDate: loan.endDate,
    isOverdue: isOverdue(loan, today),
    toolName: tools.get(loan.toolId) ?? REMOVED_TOOL_NAME,
    ownerName: people.get(loan.ownerId) ?? FORMER_NEIGHBOUR_NAME,
    borrowerName: people.get(loan.borrowerId) ?? FORMER_NEIGHBOUR_NAME,
  }));
  return { items, isTruncated };
}

export async function listUsers(ctx: QueryCtx): Promise<Capped<AdminUser & { id: Id<'users'> }>> {
  const { items: users, isTruncated } = capped(
    await ctx.db
      .query('users')
      .order('desc')
      .take(MAX_ADMIN_USERS + 1),
    MAX_ADMIN_USERS,
  );
  const items = await Promise.all(
    users.map(async (user) => {
      const listings = await ctx.db
        .query('tools')
        .withIndex('by_owner_status', (q) =>
          q.eq('ownerId', user._id).eq('status', ToolStatus.ACTIVE),
        )
        .take(MAX_COUNTED_LISTINGS);
      return {
        id: user._id,
        name: user.name,
        role: user.role,
        isTrustedLender: user.isTrustedLender,
        joinedOn: todayUtc(user._creationTime),
        activeListings: listings.length,
      };
    }),
  );
  return { items, isTruncated };
}

export async function setTrustedLender(
  ctx: MutationCtx,
  adminId: Id<'users'>,
  change: { userId: Id<'users'>; isTrustedLender: boolean },
): Promise<void> {
  const { userId, isTrustedLender } = change;
  const user = await ctx.db.get('users', userId);
  if (user === null) {
    throw domainError(ErrorCode.NOT_FOUND, 'This user does not exist.');
  }
  if (user.isTrustedLender === isTrustedLender) {
    return;
  }
  await ctx.db.patch('users', userId, { isTrustedLender });
  await recordAudit(ctx, { action: AuditAction.USER_TRUST_CHANGED, actorId: adminId, userId });
}
