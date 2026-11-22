import { loanRequestSchema, partyLoanActionSchema, Permission } from '@lendloop/contracts';
import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';

import { userMutation } from '../functions';
import { getActiveTool } from '../tools';
import { assertCan } from '../users';

import { actOnLoan, requestLoan } from './model';

/** Ask to borrow a tool for a date range. */
export const request = userMutation({
  args: loanRequestSchema(zid('tools')),
  returns: zid('loans'),
  handler: async (ctx, { toolId, startDate, endDate }) => {
    assertCan(ctx.viewer, Permission.LOANS_REQUEST);
    const tool = await getActiveTool(ctx, toolId);
    return requestLoan(ctx, ctx.viewer, tool, { startDate, endDate });
  },
});

/** Approve, decline, cancel or mark returned: whatever the transition table lets this party do. */
export const act = userMutation({
  args: { loanId: zid('loans'), action: partyLoanActionSchema },
  returns: z.null(),
  handler: async (ctx, { loanId, action }) => {
    assertCan(ctx.viewer, Permission.LOANS_ACT);
    await actOnLoan(ctx, ctx.viewer, loanId, action);
    return null;
  },
});
