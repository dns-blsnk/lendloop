import { AuditAction, ErrorCode, roleSchema, SYSTEM_ACTOR } from '@lendloop/contracts';
import { z } from 'zod';

import { recordAudit } from '../audit';
import { internalMutation } from '../functions';
import { domainError } from '../lib/errors';

/** Reading two rows is enough to tell a unique match from an ambiguous one. */
const MATCHES_TO_DETECT_DUPLICATES = 2;

/**
 * Bootstraps the first admin from the CLI:
 * `pnpm --filter @lendloop/backend exec convex run users/internal:setRole '{"email":"…","role":"admin"}'`
 */
export const setRole = internalMutation({
  args: { email: z.email(), role: roleSchema },
  returns: z.null(),
  handler: async (ctx, { email, role }) => {
    // Email is not unique across identities (a re-created Clerk account keeps the address), so an
    // ambiguous match is refused instead of promoting the wrong record.
    const matches = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email.toLowerCase()))
      .take(MATCHES_TO_DETECT_DUPLICATES);
    const [user, other] = matches;
    if (user === undefined) {
      throw domainError(ErrorCode.NOT_FOUND, 'No user with that email has signed in yet.');
    }
    if (other !== undefined) {
      throw domainError(ErrorCode.CONFLICT, 'Several accounts share that email.');
    }
    if (user.role === role) {
      return null;
    }
    await ctx.db.patch('users', user._id, { role });
    await recordAudit(ctx, {
      action: AuditAction.USER_ROLE_CHANGED,
      actorId: SYSTEM_ACTOR,
      userId: user._id,
    });
    return null;
  },
});
