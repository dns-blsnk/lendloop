import { todayUtc } from '@lendloop/contracts';
import { z } from 'zod';

import { internalMutation } from '../functions';

import { expireStaleRequests } from './model';

/** Daily: declines requests nobody answered before their first day, telling each borrower. */
export const expireStale = internalMutation({
  args: {},
  returns: z.object({ expired: z.number() }),
  handler: async (ctx) => ({ expired: await expireStaleRequests(ctx, todayUtc()) }),
});
