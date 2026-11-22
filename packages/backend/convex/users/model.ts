import { can, ErrorCode, MAX_NAME_LENGTH, Role } from '@lendloop/contracts';

import { domainError } from '../lib/errors';

import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Permission, Viewer } from '@lendloop/contracts';
import type { UserIdentity } from 'convex/server';

/** The verified identity from the Clerk token; the only way a caller becomes "signed in". */
export async function requireIdentity(ctx: QueryCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw domainError(ErrorCode.UNAUTHENTICATED, 'Sign in to continue.');
  }
  return identity;
}

function findByToken(ctx: QueryCtx, tokenIdentifier: string): Promise<Doc<'users'> | null> {
  return ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', tokenIdentifier))
    .unique();
}

export async function getViewerUser(ctx: QueryCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity === null ? null : findByToken(ctx, identity.tokenIdentifier);
}

/** The signed-in user's record; the only source of the acting user's id. */
export async function requireViewerUser(ctx: QueryCtx): Promise<Doc<'users'>> {
  const identity = await requireIdentity(ctx);
  const user = await findByToken(ctx, identity.tokenIdentifier);
  if (user === null) {
    throw domainError(ErrorCode.UNAUTHENTICATED, 'Your account is not set up yet.');
  }
  return user;
}

/** Admin gate for every admin function: the role itself, not any single permission. */
export async function requireAdminUser(ctx: QueryCtx): Promise<Doc<'users'>> {
  const viewer = await requireViewerUser(ctx);
  if (viewer.role !== Role.ADMIN) {
    throw domainError(ErrorCode.FORBIDDEN, 'Only admins can do this.');
  }
  return viewer;
}

/** Role check from the shared permission matrix; record-level rules are checked on top. */
export function assertCan(viewer: Doc<'users'>, permission: Permission): void {
  if (!can(viewer.role, permission)) {
    throw domainError(ErrorCode.FORBIDDEN, 'You are not allowed to do this.');
  }
}

/** Cuts by code points so an emoji at the limit is not split into a broken surrogate. */
function truncate(text: string, maxLength: number): string {
  return Array.from(text).slice(0, maxLength).join('');
}

function profileFromIdentity(identity: UserIdentity): { name: string; email: string } {
  const email = identity.email?.trim().toLowerCase();
  if (email === undefined || email === '') {
    throw domainError(ErrorCode.VALIDATION_FAILED, 'Your account has no email address.');
  }
  const name = identity.name?.trim() ?? '';
  const [localPart = email] = email.split('@');
  return { name: truncate(name === '' ? localPart : name, MAX_NAME_LENGTH), email };
}

/**
 * Creates the user on first sign-in and refreshes name and email from the identity provider after
 * that. Role and Trusted Lender status are never taken from the client or the token.
 */
export async function upsertFromIdentity(
  ctx: MutationCtx,
  identity: UserIdentity,
): Promise<Doc<'users'>> {
  const profile = profileFromIdentity(identity);
  const existing = await findByToken(ctx, identity.tokenIdentifier);
  if (existing !== null) {
    if (existing.name !== profile.name || existing.email !== profile.email) {
      await ctx.db.patch('users', existing._id, profile);
    }
    return { ...existing, ...profile };
  }
  const id = await ctx.db.insert('users', {
    tokenIdentifier: identity.tokenIdentifier,
    ...profile,
    role: Role.USER,
    isTrustedLender: false,
  });
  const created = await ctx.db.get('users', id);
  if (created === null) {
    throw domainError(ErrorCode.NOT_FOUND, 'The new account could not be read back.');
  }
  return created;
}

export function toViewer(user: Doc<'users'>): Viewer {
  return { name: user.name, role: user.role, isTrustedLender: user.isTrustedLender };
}
