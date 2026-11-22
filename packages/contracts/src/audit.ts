import { z } from 'zod';

/** Changes worth answering "who did this and when" for. No personal data goes into the log. */
export const AuditAction = {
  TOOL_CREATED: 'tool.created',
  TOOL_UPDATED: 'tool.updated',
  TOOL_DELETED: 'tool.deleted',
  TOOL_REMOVED_BY_ADMIN: 'tool.removedByAdmin',
  LOAN_REQUESTED: 'loan.requested',
  LOAN_APPROVED: 'loan.approved',
  LOAN_DECLINED: 'loan.declined',
  LOAN_AUTO_DECLINED: 'loan.autoDeclined',
  LOAN_WITHDRAWN: 'loan.withdrawn',
  LOAN_CANCELLED: 'loan.cancelled',
  LOAN_RETURNED: 'loan.returned',
  USER_TRUST_CHANGED: 'user.trustChanged',
  USER_ROLE_CHANGED: 'user.roleChanged',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const auditActionSchema = z.enum(AuditAction);

/** Changes made by the system itself (scheduled jobs, n8n write-backs, the CLI). */
export const SYSTEM_ACTOR = 'system';
