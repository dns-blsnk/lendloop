import { ErrorCode, MAX_HEALTH_ITEMS } from '@lendloop/contracts';

import { internal } from '../_generated/api';
import { domainError } from '../lib/errors';

import { RECIPIENT_GONE, RECIPIENT_UNDELIVERABLE } from './delivery';
import { OVERDUE_WORKFLOW } from './write_backs';

import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { AutomationHealth } from '@lendloop/contracts';

/** Pending events counted for the health page; "100+" is as precise as anyone needs. */
const MAX_PENDING_COUNTED = 100;
/** Failed events read to pick the most recent failures (sorted by when they failed). */
const MAX_FAILED_SCANNED = 200;

/**
 * Whether n8n is doing its job: the overdue workflow's last check-in, the outbox backlog, events
 * that ran out of attempts and errors reported by the error workflow. Staleness is judged by the
 * client against its clock: a cached query result would freeze "now".
 */
export async function automationHealth(ctx: QueryCtx): Promise<AutomationHealth> {
  const [heartbeat, pending, failed, errors] = await Promise.all([
    ctx.db
      .query('automationHeartbeats')
      .withIndex('by_name', (q) => q.eq('name', OVERDUE_WORKFLOW))
      .unique(),
    ctx.db
      .query('outboundEvents')
      .withIndex('by_status_nextAttemptAt', (q) => q.eq('status', 'pending'))
      .take(MAX_PENDING_COUNTED + 1),
    ctx.db
      .query('outboundEvents')
      .withIndex('by_status_nextAttemptAt', (q) => q.eq('status', 'failed'))
      .order('desc')
      .take(MAX_FAILED_SCANNED),
    ctx.db.query('workflowErrors').order('desc').take(MAX_HEALTH_ITEMS),
  ]);
  return {
    overdueWorkflow: { lastRunAt: heartbeat?.lastRunAt ?? null },
    pendingEvents: {
      count: Math.min(pending.length, MAX_PENDING_COUNTED),
      isCapped: pending.length > MAX_PENDING_COUNTED,
    },
    failedEvents: failed
      .map((event) => ({
        id: event._id,
        type: event.type,
        attempts: event.attempts,
        lastError: event.lastError ?? 'Unknown error',
        at: event.failedAt ?? event._creationTime,
      }))
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX_HEALTH_ITEMS),
    workflowErrors: errors.map((error) => ({
      executionId: error.executionId,
      workflow: error.workflow,
      ...(error.node === undefined ? {} : { node: error.node }),
      message: error.message,
      at: error.reportedAt,
    })),
  };
}

/** An admin sends a failed notification again, with a fresh set of attempts. */
export async function retryFailedEvent(
  ctx: MutationCtx,
  eventId: Id<'outboundEvents'>,
): Promise<void> {
  const event = await ctx.db.get('outboundEvents', eventId);
  if (event?.status !== 'failed') {
    throw domainError(ErrorCode.CONFLICT, 'Only failed notifications can be sent again.');
  }
  if (event.lastError === RECIPIENT_GONE || event.lastError === RECIPIENT_UNDELIVERABLE) {
    throw domainError(ErrorCode.CONFLICT, 'This notification has no valid recipient to send to.');
  }
  await ctx.db.patch('outboundEvents', eventId, {
    status: 'pending',
    attempts: 0,
    nextAttemptAt: Date.now(),
    failedAt: undefined,
  });
  await ctx.scheduler.runAfter(0, internal.automation.outbox.deliver, { eventId });
}
