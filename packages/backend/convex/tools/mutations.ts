import { Permission, toolFieldsSchema } from '@lendloop/contracts';
import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';

import { userMutation } from '../functions';
import { assertCan } from '../users';

import { createTool, deleteOwnTool, updateTool } from './model';

export const create = userMutation({
  args: toolFieldsSchema,
  returns: zid('tools'),
  handler: async (ctx, fields) => {
    assertCan(ctx.viewer, Permission.TOOLS_CREATE);
    return createTool(ctx, ctx.viewer, fields);
  },
});

export const update = userMutation({
  args: toolFieldsSchema.extend({ toolId: zid('tools') }),
  returns: z.null(),
  handler: async (ctx, { toolId, ...fields }) => {
    await updateTool(ctx, ctx.viewer, toolId, fields);
    return null;
  },
});

/** The owner deletes their own listing. Admins remove any listing through the admin module. */
export const remove = userMutation({
  args: { toolId: zid('tools') },
  returns: z.null(),
  handler: async (ctx, { toolId }) => {
    await deleteOwnTool(ctx, ctx.viewer, toolId);
    return null;
  },
});
