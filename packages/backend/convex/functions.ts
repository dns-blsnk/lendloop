/**
 * The only builders public and internal functions may use. Each one states who may call it, so a
 * function cannot be exported without an access decision (deny by default). Raw `query` and
 * `mutation` from `_generated/server` are banned elsewhere by ESLint.
 */
import { customCtx, NoOp } from 'convex-helpers/server/customFunctions';
import { zCustomAction, zCustomMutation, zCustomQuery } from 'convex-helpers/server/zod4';

import {
  internalAction as rawInternalAction,
  internalMutation as rawInternalMutation,
  internalQuery as rawInternalQuery,
  mutation as rawMutation,
  query as rawQuery,
} from './_generated/server';
import { requireAdminUser, requireIdentity, requireViewerUser } from './users';

/** Anyone, signed in or not. Must return only data that is safe for the public page. */
export const publicQuery = zCustomQuery(rawQuery, NoOp);

/** A signed-in user with an account; `ctx.viewer` is that account. */
export const userQuery = zCustomQuery(
  rawQuery,
  customCtx(async (ctx) => ({ viewer: await requireViewerUser(ctx) })),
);
export const userMutation = zCustomMutation(
  rawMutation,
  customCtx(async (ctx) => ({ viewer: await requireViewerUser(ctx) })),
);

/** Signed in with the identity provider, account not necessarily created yet (first sign-in). */
export const identityMutation = zCustomMutation(
  rawMutation,
  customCtx(async (ctx) => ({ identity: await requireIdentity(ctx) })),
);

/** Admins only; `ctx.viewer` is the admin. */
export const adminQuery = zCustomQuery(
  rawQuery,
  customCtx(async (ctx) => ({ viewer: await requireAdminUser(ctx) })),
);
export const adminMutation = zCustomMutation(
  rawMutation,
  customCtx(async (ctx) => ({ viewer: await requireAdminUser(ctx) })),
);

/** Not callable from clients: the CLI, the scheduler and signed HTTP actions only. */
export const internalQuery = zCustomQuery(rawInternalQuery, NoOp);
export const internalMutation = zCustomMutation(rawInternalMutation, NoOp);
export const internalAction = zCustomAction(rawInternalAction, NoOp);
