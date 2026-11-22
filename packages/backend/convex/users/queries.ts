import { viewerSchema } from '@lendloop/contracts';

import { publicQuery } from '../functions';

import { getViewerUser, toViewer } from './model';

/** The signed-in user, or null for guests and for a first sign-in before `ensure` ran. */
export const me = publicQuery({
  args: {},
  returns: viewerSchema.nullable(),
  handler: async (ctx) => {
    const user = await getViewerUser(ctx);
    return user === null ? null : toViewer(user);
  },
});
