import { loanEventTypeSchema, loanStatusSchema } from '@lendloop/contracts';
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
};
