import { z } from 'zod';

import { roleSchema } from './roles';

/** What the signed-in user sees about themselves. No email: the web app gets it from Clerk. */
export const viewerSchema = z.object({
  name: z.string(),
  role: roleSchema,
  isTrustedLender: z.boolean(),
});

export type Viewer = z.infer<typeof viewerSchema>;

/** Longest display name kept from the identity provider. */
export const MAX_NAME_LENGTH = 80;
