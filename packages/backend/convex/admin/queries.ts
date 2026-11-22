import {
  automationHealthSchema,
  adminLoanSchema,
  adminUserSchema,
  cappedListSchema,
  isoDateSchema,
  loanStatusSchema,
  toolCardSchema,
} from '@lendloop/contracts';
import { zid } from 'convex-helpers/server/zod4';

import { automationHealth } from '../automation';
import { adminQuery } from '../functions';
import { displayDay } from '../lib/today';
import { listToolCardsForAdmin } from '../tools';

import { listAllLoans, listUsers } from './model';

/** Every loan on the board, newest first, for admins. */
export const loans = adminQuery({
  args: { today: isoDateSchema, status: loanStatusSchema.optional() },
  returns: cappedListSchema(adminLoanSchema.extend({ id: zid('loans') })),
  handler: async (ctx, { today, status }) =>
    listAllLoans(ctx, { status, today: displayDay(today) }),
});

export const users = adminQuery({
  args: {},
  returns: cappedListSchema(adminUserSchema.extend({ id: zid('users') })),
  handler: async (ctx) => listUsers(ctx),
});

/** Every active listing, for removal by an admin. */
export const tools = adminQuery({
  args: { today: isoDateSchema },
  returns: cappedListSchema(toolCardSchema.extend({ id: zid('tools') })),
  handler: async (ctx, { today }) => listToolCardsForAdmin(ctx, ctx.viewer, displayDay(today)),
});

/** How the n8n integration is doing. */
export const automation = adminQuery({
  args: {},
  returns: automationHealthSchema,
  handler: async (ctx) => automationHealth(ctx),
});
