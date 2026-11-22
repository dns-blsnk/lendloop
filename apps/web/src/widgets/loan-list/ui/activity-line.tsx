'use client';

import { ActivityKind, DeliveryStatus, LoanEventType } from '@lendloop/contracts';

import { formatRelative } from '@/shared/lib/dates';
import { useNow } from '@/shared/lib/now';

import type { LoanActivity } from '@lendloop/contracts';

const NOTIFICATION_LABELS: Readonly<Record<LoanEventType, string>> = {
  [LoanEventType.REQUESTED]: 'Owner emailed about the request',
  [LoanEventType.APPROVED]: 'Borrower emailed: approved',
  [LoanEventType.DECLINED]: 'Borrower emailed: declined',
  [LoanEventType.AUTO_DECLINED]: 'Borrower emailed: not available',
  [LoanEventType.CANCELLED]: 'Owner emailed: cancelled',
  [LoanEventType.WITHDRAWN]: 'Borrower emailed: listing removed',
  [LoanEventType.RETURNED]: 'Borrower emailed: returned',
};

function describe(entry: LoanActivity): string {
  if (entry.kind === ActivityKind.REMINDER) {
    return 'Overdue reminder';
  }
  return entry.eventType === undefined ? 'Notification' : NOTIFICATION_LABELS[entry.eventType];
}

function label(entry: LoanActivity): string {
  const what = describe(entry);
  return entry.status === DeliveryStatus.SENT ? what : `${what} (failed)`;
}

/** What the n8n automation did for this loan, e.g. "Overdue reminder · 2 days ago". */
export function ActivityLine({ activity }: { activity: readonly LoanActivity[] }) {
  const now = useNow();
  if (activity.length === 0 || now === null) {
    return null;
  }
  return (
    <ul
      className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted"
      aria-label="Automation activity"
    >
      {activity.map((entry) => (
        <li key={entry.id}>
          {label(entry)} · {formatRelative(entry.at, now)}
        </li>
      ))}
    </ul>
  );
}
