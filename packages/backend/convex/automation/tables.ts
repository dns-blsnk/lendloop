import {
  activityKindSchema,
  deliveryStatusSchema,
  loanEventTypeSchema,
  loanStatusSchema,
} from '@lendloop/contracts';
import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { zodToConvex } from 'convex-helpers/server/zod4';

export const automationTables = {
  /**
   * Transactional outbox: a row is written in the same mutation as the loan change, then delivered
   * to n8n by an action with retries. It keeps a snapshot of the loan as it was at that moment, so
   * a late retry describes the change it is about; the recipient's email is read at send time.
   */
  outboundEvents: defineTable({
    type: zodToConvex(loanEventTypeSchema),
    loanId: v.id('loans'),
    recipientId: v.id('users'),
    snapshot: v.object({
      toolName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      status: zodToConvex(loanStatusSchema),
    }),
    status: v.union(v.literal('pending'), v.literal('delivered'), v.literal('failed')),
    /** Attempts started; counted when the attempt starts, so a crashed attempt counts too. */
    attempts: v.number(),
    /** No delivery may start before this time: retry backoff and the in-flight lease. */
    nextAttemptAt: v.number(),
    lastError: v.optional(v.string()),
    deliveredAt: v.optional(v.number()),
  }).index('by_status_nextAttemptAt', ['status', 'nextAttemptAt']),

  /**
   * What n8n reported back, one row per idempotency key (`notification:<eventId>` or
   * `reminder:<loanId>:<day>`): a retried write-back updates the row instead of adding one.
   * Shown on the loan as "Reminder sent 2 days ago".
   */
  automationActivity: defineTable({
    idempotencyKey: v.string(),
    loanId: v.id('loans'),
    kind: zodToConvex(activityKindSchema),
    eventType: v.optional(zodToConvex(loanEventTypeSchema)),
    status: zodToConvex(deliveryStatusSchema),
    error: v.optional(v.string()),
    reportedAt: v.number(),
  })
    .index('by_key', ['idempotencyKey'])
    .index('by_loan', ['loanId']),

  /** Failures reported by the n8n error workflow: where, never the payload. */
  workflowErrors: defineTable({
    executionId: v.string(),
    workflow: v.string(),
    node: v.optional(v.string()),
    message: v.string(),
    reportedAt: v.number(),
  }).index('by_execution', ['executionId']),

  /** When each scheduled n8n workflow last called in, so a workflow that stopped is visible. */
  automationHeartbeats: defineTable({
    name: v.string(),
    lastRunAt: v.number(),
  }).index('by_name', ['name']),
};
