import {
  EVENT_ID_HEADER,
  loanEventPayloadSchema,
  N8N_WEBHOOK_PATH,
  sign,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  unixSeconds,
} from '@lendloop/contracts';
import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';

import { internal } from '../_generated/api';
import { internalAction, internalMutation } from '../functions';
import { integrationEnv } from '../lib/env';

import {
  buildPayload,
  MAX_ATTEMPTS,
  NOT_CONFIGURED_RECHECK_MS,
  RECIPIENT_GONE,
  RECIPIENT_UNDELIVERABLE,
  recordFailedAttempt,
} from './delivery';

/** n8n answers once the email is sent (or failed), within this time or the attempt counts as failed. */
const DELIVERY_TIMEOUT_MS = 30_000;
/** While one delivery runs, no other may start for the same event. */
const LEASE_MS = 60_000;
/** The sweeper leaves due events alone this long, so it never races the scheduled retry. */
const SWEEP_GRACE_MS = 300_000;
const SWEEP_BATCH = 50;

const HTTP_CLIENT_ERRORS = { from: 400, to: 499 } as const;
const HTTP_REQUEST_TIMEOUT = 408;
const HTTP_TOO_MANY_REQUESTS = 429;
/** Client errors worth retrying: a timeout or "slow down". */
const RETRYABLE_CLIENT_ERRORS: readonly number[] = [HTTP_REQUEST_TIMEOUT, HTTP_TOO_MANY_REQUESTS];

/**
 * Takes the lease on a due event, counts the attempt and returns the payload, or null when it is
 * not due, already handled, or out of attempts (then it is marked failed).
 */
export const claim = internalMutation({
  args: { eventId: zid('outboundEvents') },
  returns: loanEventPayloadSchema.nullable(),
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get('outboundEvents', eventId);
    const now = Date.now();
    if (event?.status !== 'pending' || event.nextAttemptAt > now) {
      return null;
    }
    const payload = await buildPayload(ctx, event);
    if (payload === null || event.attempts >= MAX_ATTEMPTS) {
      const recipient = await ctx.db.get('users', event.recipientId);
      const reason = recipient === null ? RECIPIENT_GONE : RECIPIENT_UNDELIVERABLE;
      await ctx.db.patch('outboundEvents', eventId, {
        status: 'failed',
        lastError: payload === null ? reason : 'No attempts left.',
        failedAt: now,
      });
      return null;
    }
    await ctx.db.patch('outboundEvents', eventId, {
      attempts: event.attempts + 1,
      nextAttemptAt: now + LEASE_MS,
    });
    return payload;
  },
});

export const markDelivered = internalMutation({
  args: { eventId: zid('outboundEvents') },
  returns: z.null(),
  handler: async (ctx, { eventId }) => {
    await ctx.db.patch('outboundEvents', eventId, { status: 'delivered', deliveredAt: Date.now() });
    return null;
  },
});

export const markAttemptFailed = internalMutation({
  args: { eventId: zid('outboundEvents'), error: z.string(), isPermanent: z.boolean() },
  returns: z.null(),
  handler: async (ctx, { eventId, error, isPermanent }) => {
    const retryInMs = await recordFailedAttempt(ctx, eventId, { error, isPermanent });
    if (retryInMs !== null) {
      await ctx.scheduler.runAfter(retryInMs, internal.automation.outbox.deliver, { eventId });
    }
    return null;
  },
});

/** n8n is not set up yet: check again later without using up an attempt. */
export const postpone = internalMutation({
  args: { eventId: zid('outboundEvents') },
  returns: z.null(),
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get('outboundEvents', eventId);
    if (event?.status !== 'pending') {
      return null;
    }
    await ctx.db.patch('outboundEvents', eventId, {
      lastError: 'n8n is not configured.',
      nextAttemptAt: Date.now() + NOT_CONFIGURED_RECHECK_MS,
    });
    await ctx.scheduler.runAfter(NOT_CONFIGURED_RECHECK_MS, internal.automation.outbox.deliver, {
      eventId,
    });
    return null;
  },
});

function isPermanentStatus(status: number): boolean {
  return (
    status >= HTTP_CLIENT_ERRORS.from &&
    status <= HTTP_CLIENT_ERRORS.to &&
    !RETRYABLE_CLIENT_ERRORS.includes(status)
  );
}

/**
 * Sends one event to n8n, signed. Delivery is at least once: if n8n sent the email but its answer
 * was lost (timeout, dropped connection), the event is sent again and the email can repeat. The
 * README lists closing this gap (n8n claiming the event first) as a production change.
 */
export const deliver = internalAction({
  args: { eventId: zid('outboundEvents') },
  returns: z.null(),
  handler: async (ctx, { eventId }) => {
    const env = integrationEnv();
    if (env === null) {
      await ctx.runMutation(internal.automation.outbox.postpone, { eventId });
      return null;
    }
    const payload = await ctx.runMutation(internal.automation.outbox.claim, { eventId });
    if (payload === null) {
      return null;
    }
    const body = JSON.stringify(payload);
    const timestamp = unixSeconds();
    try {
      const response = await fetch(`${env.N8N_WEBHOOK_BASE_URL}/${N8N_WEBHOOK_PATH}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [TIMESTAMP_HEADER]: String(timestamp),
          [SIGNATURE_HEADER]: await sign(env.CONVEX_TO_N8N_SECRET, timestamp, body),
          [EVENT_ID_HEADER]: payload.eventId,
        },
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      if (response.ok) {
        await ctx.runMutation(internal.automation.outbox.markDelivered, { eventId });
        return null;
      }
      await ctx.runMutation(internal.automation.outbox.markAttemptFailed, {
        eventId,
        error: `n8n answered HTTP ${String(response.status)}.`,
        isPermanent: isPermanentStatus(response.status),
      });
    } catch (reason) {
      // Only the error's name: messages can echo URLs or payload fragments.
      const name = reason instanceof Error ? reason.name : 'Error';
      await ctx.runMutation(internal.automation.outbox.markAttemptFailed, {
        eventId,
        error: `Delivery failed (${name}).`,
        isPermanent: false,
      });
    }
    return null;
  },
});

/**
 * Safety net run by a cron: re-schedules pending events whose delivery job was lost (for example a
 * crashed action). The lease and the attempt count in `claim` keep this from looping or doubling.
 */
export const sweep = internalMutation({
  args: {},
  returns: z.object({ rescheduled: z.number() }),
  handler: async (ctx) => {
    const stuck = await ctx.db
      .query('outboundEvents')
      .withIndex('by_status_nextAttemptAt', (q) =>
        q.eq('status', 'pending').lt('nextAttemptAt', Date.now() - SWEEP_GRACE_MS),
      )
      .take(SWEEP_BATCH);
    for (const event of stuck) {
      await ctx.scheduler.runAfter(0, internal.automation.outbox.deliver, { eventId: event._id });
    }
    return { rescheduled: stuck.length };
  },
});
