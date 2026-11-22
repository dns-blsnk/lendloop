import { internal } from '../_generated/api';

import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import type { LoanEventType } from '@lendloop/contracts';

/**
 * Records that `recipientId` must be told about a loan change and schedules the delivery. Called
 * inside the mutation that changes the loan: if that mutation fails, neither the row nor the
 * scheduled delivery exists (transactional outbox).
 */
export async function enqueueLoanEvent(
  ctx: MutationCtx,
  event: {
    type: LoanEventType;
    loanId: Id<'loans'>;
    recipientId: Id<'users'>;
    snapshot: Doc<'outboundEvents'>['snapshot'];
  },
): Promise<Id<'outboundEvents'>> {
  const eventId = await ctx.db.insert('outboundEvents', {
    ...event,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.automation.outbox.deliver, { eventId });
  return eventId;
}
