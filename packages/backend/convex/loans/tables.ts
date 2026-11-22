import { loanStatusSchema } from '@lendloop/contracts';
import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { zodToConvex } from 'convex-helpers/server/zod4';

export const loansTables = {
  loans: defineTable({
    toolId: v.id('tools'),
    /** Copied from the tool so "incoming requests" is one index read. A tool never changes owner. */
    ownerId: v.id('users'),
    borrowerId: v.id('users'),
    /** Inclusive calendar days, `YYYY-MM-DD`. */
    startDate: v.string(),
    endDate: v.string(),
    status: zodToConvex(loanStatusSchema),
    returnedAt: v.optional(v.number()),
  })
    .index('by_tool_status', ['toolId', 'status'])
    .index('by_owner_status', ['ownerId', 'status'])
    .index('by_borrower_status', ['borrowerId', 'status'])
    // The admin list filters by status newest first; the date indexes sort by date instead.
    // eslint-disable-next-line @convex-dev/no-duplicate-indexes -- needs _creationTime order
    .index('by_status', ['status'])
    .index('by_status_startDate', ['status', 'startDate'])
    .index('by_status_endDate', ['status', 'endDate']),
};
