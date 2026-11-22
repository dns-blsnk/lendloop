import {
  ActivityKind,
  daysBetween,
  DeliveryStatus,
  ErrorCode,
  firstNameOf,
  isDeliverableEmail,
  LoanStatus,
  notificationKey,
  parseReminderKey,
  reminderKey,
} from '@lendloop/contracts';

import { domainError } from '../lib/errors';

import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { IsoDate, LoanActivity, LoanEventType, OverdueLoan } from '@lendloop/contracts';

export const OVERDUE_WORKFLOW = 'overdue-reminders';

/** Most reminders one run returns. */
const MAX_REMINDERS_PER_RUN = 200;
/**
 * Most overdue loans one run looks at. Each costs three reads (the reminder key, the borrower,
 * the tool), so this keeps a run well inside Convex's per-transaction read limit.
 */
const MAX_OVERDUE_SCANNED = 500;
const MS_PER_DAY = 86_400_000;

interface ActivityRecord {
  idempotencyKey: string;
  loanId: Id<'loans'>;
  kind: ActivityKind;
  eventType?: LoanEventType;
  status: DeliveryStatus;
  error?: string;
}

function findByKey(ctx: QueryCtx, key: string) {
  return ctx.db
    .query('automationActivity')
    .withIndex('by_key', (q) => q.eq('idempotencyKey', key))
    .unique();
}

/**
 * One row per key, however often n8n retries. A recorded success is final: a late "failed" for
 * the same key (an earlier attempt finishing last) does not overwrite it.
 */
async function upsertActivity(ctx: MutationCtx, record: ActivityRecord): Promise<void> {
  const existing = await findByKey(ctx, record.idempotencyKey);
  if (existing === null) {
    await ctx.db.insert('automationActivity', { ...record, reportedAt: Date.now() });
    return;
  }
  if (existing.status === DeliveryStatus.SENT) {
    return;
  }
  await ctx.db.patch('automationActivity', existing._id, {
    status: record.status,
    error: record.error,
    reportedAt: Date.now(),
  });
}

/** The newest automation entries for one loan, for its activity line. */
export async function activityOfLoan(
  ctx: QueryCtx,
  loanId: Id<'loans'>,
  limit: number,
): Promise<LoanActivity[]> {
  const rows = await ctx.db
    .query('automationActivity')
    .withIndex('by_loan_reportedAt', (q) => q.eq('loanId', loanId))
    .order('desc')
    .take(limit);
  return rows.map((row) => ({
    id: row._id,
    kind: row.kind,
    ...(row.eventType === undefined ? {} : { eventType: row.eventType }),
    status: row.status,
    at: row.reportedAt,
  }));
}

export async function recordHeartbeat(ctx: MutationCtx, name: string): Promise<void> {
  const existing = await ctx.db
    .query('automationHeartbeats')
    .withIndex('by_name', (q) => q.eq('name', name))
    .unique();
  if (existing === null) {
    await ctx.db.insert('automationHeartbeats', { name, lastRunAt: Date.now() });
  } else {
    await ctx.db.patch('automationHeartbeats', existing._id, { lastRunAt: Date.now() });
  }
}

/**
 * Starts each day's run at a different place in the overdue list, so when more loans are overdue
 * than one run sends, every one of them is reached over the following days.
 */
function rotateForDay<T>(items: readonly T[], today: IsoDate): T[] {
  if (items.length === 0) {
    return [];
  }
  const start = ((Date.parse(today) / MS_PER_DAY) * MAX_REMINDERS_PER_RUN) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

/** Approved loans past their last day that have not had a successful reminder on `today`. */
export async function listOverdueLoans(ctx: QueryCtx, today: IsoDate): Promise<OverdueLoan[]> {
  const late = await ctx.db
    .query('loans')
    .withIndex('by_status_endDate', (q) => q.eq('status', LoanStatus.APPROVED).lt('endDate', today))
    .take(MAX_OVERDUE_SCANNED);
  const rows = await Promise.all(
    rotateForDay(late, today).map(async (loan) => {
      const key = reminderKey(loan._id, today);
      const [done, borrower, tool] = await Promise.all([
        findByKey(ctx, key),
        ctx.db.get('users', loan.borrowerId),
        ctx.db.get('tools', loan.toolId),
      ]);
      // An address that is not deliverable is skipped rather than failing the whole run.
      if (done?.status === DeliveryStatus.SENT || borrower === null || tool === null) {
        return null;
      }
      if (!isDeliverableEmail(borrower.email)) {
        return null;
      }
      return {
        loanId: loan._id,
        reminderKey: key,
        borrower: { firstName: firstNameOf(borrower.name), email: borrower.email },
        toolName: tool.name,
        endDate: loan.endDate,
        daysOverdue: daysBetween(loan.endDate, today),
      };
    }),
  );
  return rows.filter((row) => row !== null).slice(0, MAX_REMINDERS_PER_RUN);
}

export async function recordReminder(
  ctx: MutationCtx,
  report: {
    loanId: string;
    reminderKey: string;
    status: DeliveryStatus;
    error?: string | undefined;
  },
): Promise<void> {
  // The key must be exactly this loan's key for a real day, and the loan must exist, so a
  // write-back can neither be filed under another loan nor under a key nobody looks up.
  const parsed = parseReminderKey(report.reminderKey);
  const loanId = ctx.db.normalizeId('loans', report.loanId);
  const loan = loanId === null ? null : await ctx.db.get('loans', loanId);
  if (loan === null || parsed?.loanId !== loan._id) {
    throw domainError(ErrorCode.VALIDATION_FAILED, 'Unknown loan or reminder key.');
  }
  await upsertActivity(ctx, {
    idempotencyKey: report.reminderKey,
    loanId: loan._id,
    kind: ActivityKind.REMINDER,
    status: report.status,
    ...(report.error === undefined ? {} : { error: report.error }),
  });
}

/**
 * n8n reports how sending a notification went. A "sent" report also settles the outbox: the
 * email went out even if Convex never saw n8n's HTTP answer (lost response, retries used up).
 */
export async function recordNotificationAck(
  ctx: MutationCtx,
  report: { eventId: string; status: DeliveryStatus; error?: string | undefined },
): Promise<void> {
  const eventId = ctx.db.normalizeId('outboundEvents', report.eventId);
  const event = eventId === null ? null : await ctx.db.get('outboundEvents', eventId);
  if (event === null) {
    throw domainError(ErrorCode.VALIDATION_FAILED, 'Unknown event.');
  }
  if (report.status === DeliveryStatus.SENT && event.status !== 'delivered') {
    await ctx.db.patch('outboundEvents', event._id, {
      status: 'delivered',
      deliveredAt: Date.now(),
    });
  }
  await upsertActivity(ctx, {
    idempotencyKey: notificationKey(event._id),
    loanId: event.loanId,
    kind: ActivityKind.NOTIFICATION,
    eventType: event.type,
    status: report.status,
    ...(report.error === undefined ? {} : { error: report.error }),
  });
}

/** Idempotent per n8n execution: the error workflow may be retried too. */
export async function recordWorkflowError(
  ctx: MutationCtx,
  report: { executionId: string; workflow: string; node?: string | undefined; message: string },
): Promise<void> {
  const existing = await ctx.db
    .query('workflowErrors')
    .withIndex('by_execution', (q) => q.eq('executionId', report.executionId))
    .unique();
  if (existing !== null) {
    return;
  }
  await ctx.db.insert('workflowErrors', {
    executionId: report.executionId,
    workflow: report.workflow,
    message: report.message,
    reportedAt: Date.now(),
    ...(report.node === undefined ? {} : { node: report.node }),
  });
}
