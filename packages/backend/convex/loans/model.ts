import {
  AuditAction,
  ErrorCode,
  LOAN_TRANSITIONS,
  LoanAction,
  LoanStatus,
  SYSTEM_ACTOR,
  todayUtc,
} from '@lendloop/contracts';

import { recordAudit } from '../audit';
import { isUnderWay } from '../domain/availability';
import { domainError } from '../lib/errors';

import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

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
  const transition = LOAN_TRANSITIONS[LoanAction.WITHDRAW_FOR_REMOVED_TOOL];
  for (const status of transition.from) {
    for (const loan of await loansOfTool(ctx, toolId, status)) {
      await ctx.db.patch('loans', loan._id, { status: transition.to });
      await recordAudit(ctx, {
        action: AuditAction.LOAN_WITHDRAWN,
        actorId: SYSTEM_ACTOR,
        loanId: loan._id,
        toolId,
      });
    }
  }
}
