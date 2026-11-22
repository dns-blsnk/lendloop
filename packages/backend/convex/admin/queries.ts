import {
  adminLoanSchema,
  adminUserSchema,
  cappedListSchema,
  isoDateSchema,
  loanStatusSchema,
} from '@lendloop/contracts';
import { zid } from 'convex-helpers/server/zod4';

import { adminQuery } from '../functions';
import { displayDay } from '../lib/today';

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
