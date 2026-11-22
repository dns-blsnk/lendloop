import { AuditAction } from '@lendloop/contracts';
import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';

import { retryFailedEvent } from '../automation';
import { adminMutation } from '../functions';
import { removeTool as removeAnyTool } from '../tools';

import { setTrustedLender } from './model';

/** Removes any listing; its open requests and future loans are cancelled. */
export const removeTool = adminMutation({
  args: { toolId: zid('tools') },
  returns: z.null(),
  handler: async (ctx, { toolId }) => {
    await removeAnyTool(ctx, toolId, {
      action: AuditAction.TOOL_REMOVED_BY_ADMIN,
      actorId: ctx.viewer._id,
    });
    return null;
  },
});

/** Gives or takes away the Trusted Lender badge. */
export const setTrusted = adminMutation({
  args: { userId: zid('users'), isTrustedLender: z.boolean() },
  returns: z.null(),
  handler: async (ctx, change) => {
    await setTrustedLender(ctx, ctx.viewer._id, change);
    return null;
  },
});

/** Sends a notification that ran out of attempts again. */
export const retryNotification = adminMutation({
  args: { eventId: zid('outboundEvents') },
  returns: z.null(),
  handler: async (ctx, { eventId }) => {
    await retryFailedEvent(ctx, eventId);
    return null;
  },
});
