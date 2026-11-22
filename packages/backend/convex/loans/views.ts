import {
  FORMER_NEIGHBOUR_NAME,
  isPartyLoanAction,
  LoanStatus,
  MAX_FINISHED_LOANS_PER_LIST,
  REMOVED_TOOL_NAME,
  ToolStatus,
  availableActions,
  LoanParty,
} from '@lendloop/contracts';

import { isOverdue } from '../domain/availability';

import { partyOf } from './model';

import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import type { IsoDate, LoanView } from '@lendloop/contracts';

export type LoanViewWithIds = LoanView & { id: Id<'loans'>; toolId: Id<'tools'> };

const FORMER_NEIGHBOUR = { name: FORMER_NEIGHBOUR_NAME, isTrustedLender: false };

async function toLoanViews(
  ctx: QueryCtx,
  loans: readonly Doc<'loans'>[],
  viewer: Doc<'users'>,
  today: IsoDate,
): Promise<LoanViewWithIds[]> {
  const own = loans.flatMap((loan) => {
    const party = partyOf(loan, viewer);
    return party === null ? [] : [{ loan, party }];
  });
  return Promise.all(
    own.map(async ({ loan, party }) => {
      const counterpartId = party === LoanParty.OWNER ? loan.borrowerId : loan.ownerId;
      const [tool, counterpart] = await Promise.all([
        ctx.db.get('tools', loan.toolId),
        ctx.db.get('users', counterpartId),
      ]);
      const person = counterpart ?? FORMER_NEIGHBOUR;
      return {
        id: loan._id,
        toolId: loan.toolId,
        status: loan.status,
        startDate: loan.startDate,
        endDate: loan.endDate,
        isOverdue: isOverdue(loan, today),
        toolName: tool?.name ?? REMOVED_TOOL_NAME,
        isToolListed: tool?.status === ToolStatus.ACTIVE,
        counterpart: { name: person.name, isTrustedLender: person.isTrustedLender },
        actions: availableActions(loan, party, today).filter(isPartyLoanAction),
      };
    }),
  );
}

const OPEN_STATUSES = [LoanStatus.REQUESTED, LoanStatus.APPROVED] as const;
const FINISHED_STATUSES = [LoanStatus.DECLINED, LoanStatus.CANCELLED, LoanStatus.RETURNED] as const;

/**
 * Every open loan on one side (requests and approved loans, so nothing actionable is ever cut
 * off) plus the most recent finished ones, newest first.
 */
async function loansOnSide(
  ctx: QueryCtx,
  side: 'ownerId' | 'borrowerId',
  userId: Id<'users'>,
): Promise<Doc<'loans'>[]> {
  const index = side === 'ownerId' ? 'by_owner_status' : 'by_borrower_status';
  const byStatus = (status: LoanStatus, limit?: number) => {
    const query = ctx.db
      .query('loans')
      .withIndex(index, (q) => q.eq(side, userId).eq('status', status))
      .order('desc');
    return limit === undefined ? query.collect() : query.take(limit);
  };
  const open = await Promise.all(OPEN_STATUSES.map((status) => byStatus(status)));
  const finished = (
    await Promise.all(
      FINISHED_STATUSES.map((status) => byStatus(status, MAX_FINISHED_LOANS_PER_LIST)),
    )
  )
    .flat()
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, MAX_FINISHED_LOANS_PER_LIST);
  return [...open.flat(), ...finished].sort((a, b) => b._creationTime - a._creationTime);
}

/** Loans the viewer asked for ("My requests"). */
export async function loansAsBorrower(
  ctx: QueryCtx,
  viewer: Doc<'users'>,
  today: IsoDate,
): Promise<LoanViewWithIds[]> {
  return toLoanViews(ctx, await loansOnSide(ctx, 'borrowerId', viewer._id), viewer, today);
}

/** Requests and loans on the viewer's tools ("Incoming requests"). */
export async function loansAsOwner(
  ctx: QueryCtx,
  viewer: Doc<'users'>,
  today: IsoDate,
): Promise<LoanViewWithIds[]> {
  return toLoanViews(ctx, await loansOnSide(ctx, 'ownerId', viewer._id), viewer, today);
}
