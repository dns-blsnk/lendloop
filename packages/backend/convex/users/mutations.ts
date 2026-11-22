import { viewerSchema } from '@lendloop/contracts';

import { identityMutation } from '../functions';

import { toViewer, upsertFromIdentity } from './model';

/** Called by the web app after sign-in: creates or refreshes the account from the Clerk token. */
export const ensure = identityMutation({
  args: {},
  returns: viewerSchema,
  handler: async (ctx) => toViewer(await upsertFromIdentity(ctx, ctx.identity)),
});
