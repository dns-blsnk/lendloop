import { firstNameOf } from '@lendloop/contracts';

import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { LoanEventPayload } from '@lendloop/contracts';

const HALF_MINUTE_MS = 30_000;
const TWO_MINUTES_MS = 120_000;
const TEN_MINUTES_MS = 600_000;
const ONE_HOUR_MS = 3_600_000;

/** Waits between attempts; after the last one the event is marked failed and shown to admins. */
export const RETRY_DELAYS_MS = [
  HALF_MINUTE_MS,
  TWO_MINUTES_MS,
  TEN_MINUTES_MS,
  ONE_HOUR_MS,
] as const;
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

/** While n8n is not configured, events wait this long between checks without using attempts. */
export const NOT_CONFIGURED_RECHECK_MS = TEN_MINUTES_MS;

/** The event as sent: its snapshot plus the recipient's current address. Null if they are gone. */
export async function buildPayload(
  ctx: QueryCtx,
  event: Doc<'outboundEvents'>,
): Promise<LoanEventPayload | null> {
  const recipient = await ctx.db.get('users', event.recipientId);
  if (recipient === null) {
    return null;
  }
  return {
    eventId: event._id,
    type: event.type,
    occurredAt: new Date(event._creationTime).toISOString(),
    recipient: { firstName: firstNameOf(recipient.name), email: recipient.email },
    loan: event.snapshot,
  };
}

/**
 * After a failed attempt (already counted when it started): schedules the next one with backoff,
 * or marks the event failed once no attempts are left. Returns the delay, or null if it gave up.
 */
export async function recordFailedAttempt(
  ctx: MutationCtx,
  eventId: Id<'outboundEvents'>,
  failure: { error: string; isPermanent: boolean },
): Promise<number | null> {
  const event = await ctx.db.get('outboundEvents', eventId);
  if (event?.status !== 'pending') {
    return null;
  }
  const delay = failure.isPermanent ? undefined : RETRY_DELAYS_MS[event.attempts - 1];
  if (delay === undefined) {
    await ctx.db.patch('outboundEvents', eventId, { status: 'failed', lastError: failure.error });
    return null;
  }
  await ctx.db.patch('outboundEvents', eventId, {
    lastError: failure.error,
    nextAttemptAt: Date.now() + delay,
  });
  return delay;
}
