import {
  isoDateSchema,
  publicToolSchema,
  toolCardSchema,
  toolCategorySchema,
} from '@lendloop/contracts';
import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';

import { publicQuery, userQuery } from '../functions';
import { displayDay } from '../lib/today';

import { getToolCard, listOwnToolCards, listPublicTools, listToolCards } from './model';

const toolCardWithId = toolCardSchema.extend({ id: zid('tools') });

/** The public page: tools free today, as name and category only (plus the id as a list key). */
export const listPublic = publicQuery({
  args: { today: isoDateSchema },
  returns: z.array(publicToolSchema.extend({ id: zid('tools') })),
  handler: async (ctx, { today }) => listPublicTools(ctx, displayDay(today)),
});

/** Every listed tool with its availability, optionally one category. */
export const list = userQuery({
  args: { today: isoDateSchema, category: toolCategorySchema.optional() },
  returns: z.array(toolCardWithId),
  handler: async (ctx, { today, category }) =>
    listToolCards(ctx, ctx.viewer, { category, today: displayDay(today) }),
});

/** The viewer's own listings. */
export const mine = userQuery({
  args: { today: isoDateSchema },
  returns: z.array(toolCardWithId),
  handler: async (ctx, { today }) => listOwnToolCards(ctx, ctx.viewer, displayDay(today)),
});

export const get = userQuery({
  args: { today: isoDateSchema, toolId: zid('tools') },
  returns: toolCardWithId,
  handler: async (ctx, { today, toolId }) =>
    getToolCard(ctx, ctx.viewer, toolId, displayDay(today)),
});
