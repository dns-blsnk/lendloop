import { roleSchema } from '@lendloop/contracts';
import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { zodToConvex } from 'convex-helpers/server/zod4';

export const usersTables = {
  users: defineTable({
    /** Stable id from the identity provider (issuer + subject). */
    tokenIdentifier: v.string(),
    name: v.string(),
    /** Needed only to deliver notifications; never returned to other users. */
    email: v.string(),
    role: zodToConvex(roleSchema),
    isTrustedLender: v.boolean(),
  })
    .index('by_token', ['tokenIdentifier'])
    .index('by_email', ['email']),
};
