import { z } from 'zod';

/** What happened to a loan, from the point of view of the person being told. */
export const LoanEventType = {
  REQUESTED: 'loan.requested',
  APPROVED: 'loan.approved',
  DECLINED: 'loan.declined',
  AUTO_DECLINED: 'loan.autoDeclined',
  CANCELLED: 'loan.cancelled',
  WITHDRAWN: 'loan.withdrawn',
  RETURNED: 'loan.returned',
} as const;

export type LoanEventType = (typeof LoanEventType)[keyof typeof LoanEventType];

export const loanEventTypeSchema = z.enum(LoanEventType);
