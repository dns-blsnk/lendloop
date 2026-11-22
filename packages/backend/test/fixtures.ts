import { LoanStatus, ToolCategory, ToolCondition } from '@lendloop/contracts';

import type { Id } from '../convex/_generated/dataModel';
import type { TestConvex } from './harness';

export const drill = {
  name: 'Cordless drill',
  category: ToolCategory.POWER_TOOLS,
  condition: ToolCondition.GOOD,
  description: 'Two batteries.',
};

export function userIdByEmail(t: TestConvex, email: string): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    if (user === null) {
      throw new Error(`No user ${email}`);
    }
    return user._id;
  });
}

/** Inserts a loan directly, for states the loans module would take several steps to reach. */
export function insertLoan(
  t: TestConvex,
  loan: {
    toolId: Id<'tools'>;
    borrowerId: Id<'users'>;
    startDate: string;
    endDate: string;
    status?: LoanStatus;
  },
): Promise<Id<'loans'>> {
  return t.run(async (ctx) => {
    const tool = await ctx.db.get('tools', loan.toolId);
    if (tool === null) {
      throw new Error('No tool');
    }
    return ctx.db.insert('loans', {
      status: LoanStatus.REQUESTED,
      ...loan,
      ownerId: tool.ownerId,
    });
  });
}
