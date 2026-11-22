import {
  AuditAction,
  LoanEventType,
  LoanStatus,
  Role,
  todayUtc,
  ToolCategory,
  ToolCondition,
  ToolStatus,
} from '@lendloop/contracts';
import { z } from 'zod';

import { recordAudit } from '../audit';
import { enqueueLoanEvent } from '../automation';
import { internalMutation } from '../functions';

import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

const MS_PER_DAY = 86_400_000;
const day = (offset: number) => todayUtc(Date.now() + offset * MS_PER_DAY);

/** Demo neighbours. They cannot sign in (no Clerk account); they make the board look lived in. */
const NEIGHBOURS = [
  { key: 'olga', name: 'Olga Kowalski', email: 'olga@example.com', isTrustedLender: true },
  { key: 'sam', name: 'Sam Rivera', email: 'sam@example.com', isTrustedLender: false },
  { key: 'mia', name: 'Mia Chen', email: 'mia@example.com', isTrustedLender: false },
] as const;

const TOOLS = [
  {
    owner: 'olga',
    name: 'Cordless drill',
    category: ToolCategory.POWER_TOOLS,
    condition: ToolCondition.GOOD,
    description: 'Two batteries and a set of bits.',
  },
  {
    owner: 'olga',
    name: 'Extension ladder (5 m)',
    category: ToolCategory.LADDERS,
    condition: ToolCondition.FAIR,
    description: 'Heavy; you will need a car.',
  },
  {
    owner: 'sam',
    name: 'Hedge trimmer',
    category: ToolCategory.GARDEN,
    condition: ToolCondition.LIKE_NEW,
    description: 'Electric, 10 m cable.',
  },
  {
    owner: 'sam',
    name: 'Two-person tent',
    category: ToolCategory.CAMPING,
    condition: ToolCondition.GOOD,
    description: 'Packs small, waterproof.',
  },
  {
    owner: 'mia',
    name: 'Stand mixer',
    category: ToolCategory.KITCHEN,
    condition: ToolCondition.GOOD,
    description: 'With dough hook and whisk.',
  },
  {
    owner: 'mia',
    name: 'Carpet cleaner',
    category: ToolCategory.CLEANING,
    condition: ToolCondition.WORN,
    description: 'Works fine, looks tired.',
  },
] as const;

type NeighbourKey = (typeof NEIGHBOURS)[number]['key'];

async function insertNeighbours(ctx: MutationCtx): Promise<Record<NeighbourKey, Id<'users'>>> {
  const ids = {} as Record<NeighbourKey, Id<'users'>>;
  for (const neighbour of NEIGHBOURS) {
    ids[neighbour.key] = await ctx.db.insert('users', {
      tokenIdentifier: `seed|${neighbour.key}`,
      name: neighbour.name,
      email: neighbour.email,
      role: Role.USER,
      isTrustedLender: neighbour.isTrustedLender,
    });
  }
  return ids;
}

/**
 * Fills an empty deployment with demo data: neighbours, their tools, an open request (which sends
 * a real notification through the outbox), an approved loan and an overdue loan for the reminder
 * workflow. Refuses to run twice. Run: `convex run seed/internal:run`.
 */
export const run = internalMutation({
  args: {},
  returns: z.object({ seeded: z.boolean() }),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', 'seed|olga'))
      .unique();
    if (existing !== null) {
      return { seeded: false };
    }
    const people = await insertNeighbours(ctx);
    const tools: Id<'tools'>[] = [];
    for (const { owner, ...fields } of TOOLS) {
      tools.push(
        await ctx.db.insert('tools', {
          ...fields,
          ownerId: people[owner],
          status: ToolStatus.ACTIVE,
        }),
      );
    }
    const [drill, ladder, , tent] = tools as [Id<'tools'>, Id<'tools'>, Id<'tools'>, Id<'tools'>];

    /** Inserts a loan as the app would have left it, with its audit entry. */
    const loan = async (
      toolId: Id<'tools'>,
      people_: { ownerId: Id<'users'>; borrowerId: Id<'users'> },
      plan: { from: number; to: number; status: LoanStatus; audit: AuditAction },
    ) => {
      const loanId = await ctx.db.insert('loans', {
        toolId,
        ...people_,
        startDate: day(plan.from),
        endDate: day(plan.to),
        status: plan.status,
      });
      await recordAudit(ctx, { action: plan.audit, actorId: people_.borrowerId, loanId, toolId });
      const created = await ctx.db.get('loans', loanId);
      if (created === null) {
        throw new Error('Seed loan vanished');
      }
      return created;
    };

    const requested = await loan(
      drill,
      { ownerId: people.olga, borrowerId: people.sam },
      { from: 2, to: 4, status: LoanStatus.REQUESTED, audit: AuditAction.LOAN_REQUESTED },
    );
    const drillTool = await ctx.db.get('tools', drill);
    await enqueueLoanEvent(ctx, {
      type: LoanEventType.REQUESTED,
      loanId: requested._id,
      recipientId: requested.ownerId,
      snapshot: {
        toolName: drillTool?.name ?? '',
        startDate: requested.startDate,
        endDate: requested.endDate,
        status: requested.status,
      },
    });
    await loan(
      tent,
      { ownerId: people.sam, borrowerId: people.mia },
      { from: 5, to: 8, status: LoanStatus.APPROVED, audit: AuditAction.LOAN_APPROVED },
    );
    await loan(
      ladder,
      { ownerId: people.olga, borrowerId: people.mia },
      { from: -6, to: -2, status: LoanStatus.APPROVED, audit: AuditAction.LOAN_APPROVED },
    );
    return { seeded: true };
  },
});
