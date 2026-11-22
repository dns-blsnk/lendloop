import { isoDateSchema, loanViewSchema } from '@lendloop/contracts';
import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';

import { userQuery } from '../functions';
import { displayDay } from '../lib/today';

import { loansAsBorrower, loansAsOwner } from './model';

const loanViews = z.array(loanViewSchema.extend({ id: zid('loans'), toolId: zid('tools') }));

/** "My requests": loans the viewer asked for. */
export const mine = userQuery({
  args: { today: isoDateSchema },
  returns: loanViews,
  handler: async (ctx, { today }) => loansAsBorrower(ctx, ctx.viewer, displayDay(today)),
});

/** "Incoming requests": loans on the viewer's tools. */
export const incoming = userQuery({
  args: { today: isoDateSchema },
  returns: loanViews,
  handler: async (ctx, { today }) => loansAsOwner(ctx, ctx.viewer, displayDay(today)),
});
