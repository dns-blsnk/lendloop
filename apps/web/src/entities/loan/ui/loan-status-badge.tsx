import { LoanStatus } from '@lendloop/contracts';

import { Badge } from '@/shared/ui/badge';

import type { BadgeTone } from '@/shared/ui/badge';

/** Display names for loan statuses, for badges and filters alike. */
export const LOAN_STATUS_LABELS: Readonly<Record<LoanStatus, string>> = {
  [LoanStatus.REQUESTED]: 'Requested',
  [LoanStatus.APPROVED]: 'Approved',
  [LoanStatus.DECLINED]: 'Declined',
  [LoanStatus.CANCELLED]: 'Cancelled',
  [LoanStatus.RETURNED]: 'Returned',
};

const STATUS_LOOK: Readonly<Record<LoanStatus, { label: string; tone: BadgeTone }>> = {
  [LoanStatus.REQUESTED]: { label: LOAN_STATUS_LABELS[LoanStatus.REQUESTED], tone: 'warning' },
  [LoanStatus.APPROVED]: { label: LOAN_STATUS_LABELS[LoanStatus.APPROVED], tone: 'accent' },
  [LoanStatus.DECLINED]: { label: LOAN_STATUS_LABELS[LoanStatus.DECLINED], tone: 'neutral' },
  [LoanStatus.CANCELLED]: { label: LOAN_STATUS_LABELS[LoanStatus.CANCELLED], tone: 'neutral' },
  [LoanStatus.RETURNED]: { label: LOAN_STATUS_LABELS[LoanStatus.RETURNED], tone: 'neutral' },
};

/** Overdue outranks the stored status: it is what either party needs to act on. */
export function statusLook(status: LoanStatus, isOverdue: boolean) {
  return isOverdue ? { label: 'Overdue', tone: 'danger' as const } : STATUS_LOOK[status];
}

export function LoanStatusBadge({ status, isOverdue }: { status: LoanStatus; isOverdue: boolean }) {
  const { label, tone } = statusLook(status, isOverdue);
  return <Badge tone={tone}>{label}</Badge>;
}
