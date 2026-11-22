import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import type { AuditAction, SYSTEM_ACTOR } from '@lendloop/contracts';

export interface AuditEntry {
  action: AuditAction;
  actorId: Id<'users'> | typeof SYSTEM_ACTOR;
  toolId?: Id<'tools'>;
  loanId?: Id<'loans'>;
  userId?: Id<'users'>;
}

/** Appends one entry in the same transaction as the change it describes. */
export async function recordAudit(ctx: MutationCtx, entry: AuditEntry): Promise<void> {
  await ctx.db.insert('auditLog', entry);
}
