import {
  FORMER_NEIGHBOUR_NAME,
  REMOVED_TOOL_NAME,
  AuditAction,
  availableActions,
  ErrorCode,
  isPartyLoanAction,
  LOAN_TRANSITIONS,
  LoanAction,
  LoanParty,
  LoanStatus,
  MAX_FINISHED_LOANS_PER_LIST,
  MAX_OPEN_REQUESTS_PER_BORROWER,
  rangesOverlap,
  SYSTEM_ACTOR,
  todayUtc,
  ToolStatus,
  transitionProblem,
} from '@lendloop/contracts';

import { recordAudit } from '../audit';
import { isOverdue, isUnderWay } from '../domain/availability';
import { domainError } from '../lib/errors';

import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { IsoDate, LoanDates, LoanView, PartyLoanAction } from '@lendloop/contracts';

export type LoanViewWithIds = LoanView & { id: Id<'loans'>; toolId: Id<'tools'> };

const AUDIT_ACTION_FOR: Readonly<Record<LoanAction, AuditAction>> = {
  [LoanAction.APPROVE]: AuditAction.LOAN_APPROVED,
  [LoanAction.DECLINE]: AuditAction.LOAN_DECLINED,
  [LoanAction.CANCEL]: AuditAction.LOAN_CANCELLED,
  [LoanAction.MARK_RETURNED]: AuditAction.LOAN_RETURNED,
  [LoanAction.AUTO_DECLINE]: AuditAction.LOAN_AUTO_DECLINED,
  [LoanAction.WITHDRAW_FOR_REMOVED_TOOL]: AuditAction.LOAN_WITHDRAWN,
};

const FORMER_NEIGHBOUR = { name: FORMER_NEIGHBOUR_NAME, isTrustedLender: false };

export function loansOfTool(
  ctx: QueryCtx,
  toolId: Id<'tools'>,
  status: LoanStatus,
): Promise<Doc<'loans'>[]> {
  return ctx.db
    .query('loans')
    .withIndex('by_tool_status', (q) => q.eq('toolId', toolId).eq('status', status))
    .collect();
}

/** Approved loans of a tool: the only ones that decide whether it is out right now. */
export function approvedLoansOfTool(ctx: QueryCtx, toolId: Id<'tools'>): Promise<Doc<'loans'>[]> {
  return loansOfTool(ctx, toolId, LoanStatus.APPROVED);
}

/**
 * The single place a loan changes status: checks the transition table (status and timing against
 * the server clock), writes the change and its audit entry. Notifications for `transition.notify`
 * hang off this function as well.
 */
async function applyTransition(
  ctx: MutationCtx,
  loan: Doc<'loans'>,
  action: LoanAction,
  actorId: Id<'users'> | typeof SYSTEM_ACTOR,
): Promise<void> {
  const problem = transitionProblem(loan, action, todayUtc());
  if (problem !== null) {
    throw domainError(ErrorCode.INVALID_TRANSITION, problem);
  }
  const transition = LOAN_TRANSITIONS[action];
  const returnedAt = action === LoanAction.MARK_RETURNED ? { returnedAt: Date.now() } : {};
  await ctx.db.patch('loans', loan._id, { status: transition.to, ...returnedAt });
  await recordAudit(ctx, {
    action: AUDIT_ACTION_FOR[action],
    actorId,
    loanId: loan._id,
    toolId: loan.toolId,
  });
}

/**
 * Cancels every open request and every approved loan of a tool that is being taken off the board.
 * Refuses (and changes nothing) while a loan is under way: the borrower has the tool.
 */
export async function withdrawLoansOfRemovedTool(
  ctx: MutationCtx,
  toolId: Id<'tools'>,
): Promise<void> {
  const today = todayUtc();
  if ((await approvedLoansOfTool(ctx, toolId)).some((loan) => isUnderWay(loan, today))) {
    throw domainError(ErrorCode.CONFLICT, 'This tool is out on loan; mark it returned first.');
  }
  for (const status of LOAN_TRANSITIONS[LoanAction.WITHDRAW_FOR_REMOVED_TOOL].from) {
    for (const loan of await loansOfTool(ctx, toolId, status)) {
      await applyTransition(ctx, loan, LoanAction.WITHDRAW_FOR_REMOVED_TOOL, SYSTEM_ACTOR);
    }
  }
}

async function assertNoApprovedOverlap(
  ctx: QueryCtx,
  toolId: Id<'tools'>,
  dates: LoanDates,
): Promise<void> {
  const approved = await approvedLoansOfTool(ctx, toolId);
  if (approved.some((loan) => rangesOverlap(loan, dates))) {
    throw domainError(ErrorCode.CONFLICT, 'The tool is already booked for some of these days.');
  }
}

/** Open requests that can still be answered; stale ones expire daily and do not count. */
async function liveRequestsOf(
  ctx: QueryCtx,
  borrowerId: Id<'users'>,
  today: IsoDate,
): Promise<Doc<'loans'>[]> {
  const open = await ctx.db
    .query('loans')
    .withIndex('by_borrower_status', (q) =>
      q.eq('borrowerId', borrowerId).eq('status', LoanStatus.REQUESTED),
    )
    .collect();
  return open.filter((loan) => loan.startDate >= today);
}

export async function requestLoan(
  ctx: MutationCtx,
  borrower: Doc<'users'>,
  tool: Doc<'tools'>,
  dates: LoanDates,
): Promise<Id<'loans'>> {
  if (tool.ownerId === borrower._id) {
    throw domainError(ErrorCode.VALIDATION_FAILED, 'You cannot borrow your own tool.');
  }
  const today = todayUtc();
  if (dates.startDate < today) {
    throw domainError(ErrorCode.VALIDATION_FAILED, 'The loan cannot start in the past.');
  }
  const open = await liveRequestsOf(ctx, borrower._id, today);
  if (open.length >= MAX_OPEN_REQUESTS_PER_BORROWER) {
    throw domainError(ErrorCode.RATE_LIMITED, 'You have too many open requests; wait for answers.');
  }
  if (open.some((loan) => loan.toolId === tool._id && rangesOverlap(loan, dates))) {
    throw domainError(ErrorCode.CONFLICT, 'You already asked for this tool on these days.');
  }
  await assertNoApprovedOverlap(ctx, tool._id, dates);
  const loanId = await ctx.db.insert('loans', {
    toolId: tool._id,
    ownerId: tool.ownerId,
    borrowerId: borrower._id,
    ...dates,
    status: LoanStatus.REQUESTED,
  });
  await recordAudit(ctx, {
    action: AuditAction.LOAN_REQUESTED,
    actorId: borrower._id,
    loanId,
    toolId: tool._id,
  });
  return loanId;
}

function partyOf(loan: Doc<'loans'>, viewer: Doc<'users'>): LoanParty | null {
  if (loan.ownerId === viewer._id) {
    return LoanParty.OWNER;
  }
  return loan.borrowerId === viewer._id ? LoanParty.BORROWER : null;
}

/** Declines every other open request whose dates collide with a loan that was just approved. */
async function declineCompetingRequests(ctx: MutationCtx, approved: Doc<'loans'>): Promise<void> {
  for (const other of await loansOfTool(ctx, approved.toolId, LoanStatus.REQUESTED)) {
    if (other._id !== approved._id && rangesOverlap(other, approved)) {
      await applyTransition(ctx, other, LoanAction.AUTO_DECLINE, SYSTEM_ACTOR);
    }
  }
}

/**
 * A party acts on a loan. Only the owner or the borrower of this loan may act, and only as the
 * transition table allows; admins have no say over other people's loans.
 */
export async function actOnLoan(
  ctx: MutationCtx,
  viewer: Doc<'users'>,
  loanId: Id<'loans'>,
  action: PartyLoanAction,
): Promise<void> {
  const loan = await ctx.db.get('loans', loanId);
  const party = loan === null ? null : partyOf(loan, viewer);
  if (loan === null || party === null) {
    throw domainError(ErrorCode.NOT_FOUND, 'This loan does not exist.');
  }
  const transition = LOAN_TRANSITIONS[action];
  if (transition.by !== party) {
    throw domainError(ErrorCode.FORBIDDEN, `Only the ${transition.by} can do this.`);
  }
  if (action === LoanAction.APPROVE) {
    await assertNoApprovedOverlap(ctx, loan.toolId, loan);
  }
  await applyTransition(ctx, loan, action, viewer._id);
  if (action === LoanAction.APPROVE) {
    await declineCompetingRequests(ctx, loan);
  }
}

/** Declines requests nobody answered before their first day; run daily by a cron. */
export async function expireStaleRequests(ctx: MutationCtx, today: IsoDate): Promise<number> {
  const stale = await ctx.db
    .query('loans')
    .withIndex('by_status_startDate', (q) =>
      q.eq('status', LoanStatus.REQUESTED).lt('startDate', today),
    )
    .collect();
  for (const loan of stale) {
    await applyTransition(ctx, loan, LoanAction.AUTO_DECLINE, SYSTEM_ACTOR);
  }
  return stale.length;
}

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
