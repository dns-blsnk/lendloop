import { auditActionSchema, SYSTEM_ACTOR } from '@lendloop/contracts';
import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { zodToConvex } from 'convex-helpers/server/zod4';

export const auditTables = {
  /** Append-only. Ids and action names only: no names, emails or free text. */
  auditLog: defineTable({
    action: zodToConvex(auditActionSchema),
    /** Required, so a forgotten actor is a type error rather than a fake "system" entry. */
    actorId: v.union(v.id('users'), v.literal(SYSTEM_ACTOR)),
    toolId: v.optional(v.id('tools')),
    loanId: v.optional(v.id('loans')),
    userId: v.optional(v.id('users')),
  })
    .index('by_tool', ['toolId'])
    .index('by_loan', ['loanId'])
    .index('by_user', ['userId'])
    .index('by_actor', ['actorId']),
};
