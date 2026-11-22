import {
  FORMER_NEIGHBOUR_NAME,
  AuditAction,
  ErrorCode,
  MAX_ADMIN_TOOLS,
  MAX_TOOLS_PER_LIST,
  ToolStatus,
} from '@lendloop/contracts';

import { recordAudit } from '../audit';
import { availabilityOf } from '../domain/availability';
import { domainError } from '../lib/errors';
import { approvedLoansOfTool, toolIdsOutOnLoan, withdrawLoansOfRemovedTool } from '../loans';

import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type {
  IsoDate,
  Lender,
  PublicTool,
  ToolCard,
  ToolCategory,
  ToolFields,
  Availability,
} from '@lendloop/contracts';

export type ToolCardWithId = ToolCard & { id: Id<'tools'> };

/** How many listings the public page looks through to find the ones free today. */
const MAX_TOOLS_SCANNED_FOR_PUBLIC_LIST = 1000;

const FORMER_NEIGHBOUR: Lender = { name: FORMER_NEIGHBOUR_NAME, isTrustedLender: false };

/** A listing that is still on the board; removed ones look like they never existed. */
export async function getActiveTool(ctx: QueryCtx, toolId: Id<'tools'>): Promise<Doc<'tools'>> {
  const tool = await ctx.db.get('tools', toolId);
  if (tool?.status !== ToolStatus.ACTIVE) {
    throw domainError(ErrorCode.NOT_FOUND, 'This tool is no longer listed.');
  }
  return tool;
}

export function assertOwner(tool: Doc<'tools'>, viewer: Doc<'users'>): void {
  if (tool.ownerId !== viewer._id) {
    throw domainError(ErrorCode.FORBIDDEN, 'Only the owner can change this listing.');
  }
}

function activeTools(ctx: QueryCtx, category: ToolCategory | undefined, limit: number) {
  const query =
    category === undefined
      ? ctx.db.query('tools').withIndex('by_status', (q) => q.eq('status', ToolStatus.ACTIVE))
      : ctx.db
          .query('tools')
          .withIndex('by_status_category', (q) =>
            q.eq('status', ToolStatus.ACTIVE).eq('category', category),
          );
  return query.order('desc').take(limit);
}

async function toolAvailability(
  ctx: QueryCtx,
  toolId: Id<'tools'>,
  today: IsoDate,
): Promise<Availability> {
  return availabilityOf(await approvedLoansOfTool(ctx, toolId), today);
}

/** Builds cards for one list, reading each lender once. */
async function toToolCards(
  ctx: QueryCtx,
  tools: readonly Doc<'tools'>[],
  viewer: Doc<'users'>,
  today: IsoDate,
): Promise<ToolCardWithId[]> {
  const ownerIds = [...new Set(tools.map((tool) => tool.ownerId))].filter(
    (id) => id !== viewer._id,
  );
  const owners = await Promise.all(ownerIds.map((id) => ctx.db.get('users', id)));
  const lenders = new Map<Id<'users'>, Lender>([
    [viewer._id, viewer],
    ...ownerIds.map((id, index): [Id<'users'>, Lender] => [id, owners[index] ?? FORMER_NEIGHBOUR]),
  ]);
  return Promise.all(
    tools.map(async (tool) => {
      const lender = lenders.get(tool.ownerId) ?? FORMER_NEIGHBOUR;
      return {
        id: tool._id,
        name: tool.name,
        category: tool.category,
        condition: tool.condition,
        description: tool.description,
        availability: await toolAvailability(ctx, tool._id, today),
        lender: { name: lender.name, isTrustedLender: lender.isTrustedLender },
        isMine: tool.ownerId === viewer._id,
      };
    }),
  );
}

/** Tools that can be borrowed today, newest first: name and category plus the id as a list key. */
export async function listPublicTools(
  ctx: QueryCtx,
  today: IsoDate,
): Promise<(PublicTool & { id: Id<'tools'> })[]> {
  const [tools, outOnLoan] = await Promise.all([
    activeTools(ctx, undefined, MAX_TOOLS_SCANNED_FOR_PUBLIC_LIST),
    toolIdsOutOnLoan(ctx, today),
  ]);
  return tools
    .filter((tool) => !outOnLoan.has(tool._id))
    .slice(0, MAX_TOOLS_PER_LIST)
    .map((tool) => ({ id: tool._id, name: tool.name, category: tool.category }));
}

export async function listToolCards(
  ctx: QueryCtx,
  viewer: Doc<'users'>,
  options: { category: ToolCategory | undefined; today: IsoDate },
): Promise<ToolCardWithId[]> {
  const tools = await activeTools(ctx, options.category, MAX_TOOLS_PER_LIST);
  return toToolCards(ctx, tools, viewer, options.today);
}

/** Every active listing for the admin, newest first, saying whether the list was cut. */
export async function listToolCardsForAdmin(
  ctx: QueryCtx,
  admin: Doc<'users'>,
  today: IsoDate,
): Promise<{ items: ToolCardWithId[]; isTruncated: boolean }> {
  const tools = await activeTools(ctx, undefined, MAX_ADMIN_TOOLS + 1);
  const items = await toToolCards(ctx, tools.slice(0, MAX_ADMIN_TOOLS), admin, today);
  return { items, isTruncated: tools.length > MAX_ADMIN_TOOLS };
}

export async function listOwnToolCards(
  ctx: QueryCtx,
  viewer: Doc<'users'>,
  today: IsoDate,
): Promise<ToolCardWithId[]> {
  const tools = await ctx.db
    .query('tools')
    .withIndex('by_owner_status', (q) =>
      q.eq('ownerId', viewer._id).eq('status', ToolStatus.ACTIVE),
    )
    .order('desc')
    .take(MAX_TOOLS_PER_LIST);
  return toToolCards(ctx, tools, viewer, today);
}

/** A tool's card, or null once it is removed: pages watching it show "no longer listed". */
export async function getToolCard(
  ctx: QueryCtx,
  viewer: Doc<'users'>,
  toolId: Id<'tools'>,
  today: IsoDate,
): Promise<ToolCardWithId | null> {
  const tool = await ctx.db.get('tools', toolId);
  if (tool?.status !== ToolStatus.ACTIVE) {
    return null;
  }
  const [card] = await toToolCards(ctx, [tool], viewer, today);
  return card ?? null;
}

export async function createTool(
  ctx: MutationCtx,
  owner: Doc<'users'>,
  fields: ToolFields,
): Promise<Id<'tools'>> {
  const toolId = await ctx.db.insert('tools', {
    ...fields,
    ownerId: owner._id,
    status: ToolStatus.ACTIVE,
  });
  await recordAudit(ctx, { action: AuditAction.TOOL_CREATED, actorId: owner._id, toolId });
  return toolId;
}

export async function updateTool(
  ctx: MutationCtx,
  viewer: Doc<'users'>,
  toolId: Id<'tools'>,
  fields: ToolFields,
): Promise<void> {
  assertOwner(await getActiveTool(ctx, toolId), viewer);
  await ctx.db.patch('tools', toolId, fields);
  await recordAudit(ctx, { action: AuditAction.TOOL_UPDATED, actorId: viewer._id, toolId });
}

export type ToolRemoval =
  | { action: typeof AuditAction.TOOL_DELETED; actorId: Id<'users'> }
  | { action: typeof AuditAction.TOOL_REMOVED_BY_ADMIN; actorId: Id<'users'> };

/**
 * Takes a listing off the board (soft delete) and cancels its open requests and future loans. A
 * tool that is out with a borrower cannot be removed until it comes back.
 */
export async function removeTool(
  ctx: MutationCtx,
  toolId: Id<'tools'>,
  removal: ToolRemoval,
): Promise<void> {
  await getActiveTool(ctx, toolId);
  await withdrawLoansOfRemovedTool(ctx, toolId);
  await ctx.db.patch('tools', toolId, { status: ToolStatus.REMOVED });
  await recordAudit(ctx, { ...removal, toolId });
}

/** The owner deletes their own listing. */
export async function deleteOwnTool(
  ctx: MutationCtx,
  viewer: Doc<'users'>,
  toolId: Id<'tools'>,
): Promise<void> {
  assertOwner(await getActiveTool(ctx, toolId), viewer);
  await removeTool(ctx, toolId, { action: AuditAction.TOOL_DELETED, actorId: viewer._id });
}
