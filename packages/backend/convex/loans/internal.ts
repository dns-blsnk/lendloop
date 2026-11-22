import { todayUtc } from '@lendloop/contracts';
import { z } from 'zod';

import { internal } from '../_generated/api';
import { internalMutation } from '../functions';

import { expireStaleRequests } from './model';

/**
 * Daily: declines requests nobody answered before their first day, telling each borrower. Works in
 * batches and schedules itself again while more are waiting.
 */
export const expireStale = internalMutation({
  args: {},
  returns: z.object({ expired: z.number() }),
  handler: async (ctx) => {
    const { expired, hasMore } = await expireStaleRequests(ctx, todayUtc());
    if (hasMore) {
      await ctx.scheduler.runAfter(0, internal.loans.internal.expireStale, {});
    }
    return { expired };
  },
});
