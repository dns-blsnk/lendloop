import { toolCategorySchema, toolConditionSchema, toolStatusSchema } from '@lendloop/contracts';
import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { zodToConvex } from 'convex-helpers/server/zod4';

export const toolsTables = {
  tools: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    category: zodToConvex(toolCategorySchema),
    condition: zodToConvex(toolConditionSchema),
    description: v.string(),
    status: zodToConvex(toolStatusSchema),
  })
    .index('by_status_category', ['status', 'category'])
    .index('by_owner_status', ['ownerId', 'status']),
};
