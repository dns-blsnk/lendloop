import { LoanStatus } from '@lendloop/contracts';

import type { BadgeTone } from '@/shared/ui/badge';
import type { IsoDate } from '@lendloop/contracts';

const DAY_MONTH = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const yearOf = (date: IsoDate) => date.slice(0, '2026'.length);

/** "3 Dec – 5 Dec", with years once the range leaves the current year. Dates are UTC days. */
export function formatDateRange(startDate: IsoDate, endDate: IsoDate, today: IsoDate): string {
  const sameYear = yearOf(startDate) === yearOf(today) && yearOf(endDate) === yearOf(today);
  const format = (date: IsoDate) =>
    (sameYear ? DAY_MONTH : DAY_MONTH_YEAR).format(new Date(`${date}T00:00:00Z`));
  return startDate === endDate ? format(startDate) : `${format(startDate)} – ${format(endDate)}`;
}

const STATUS_LOOK: Readonly<Record<LoanStatus, { label: string; tone: BadgeTone }>> = {
  [LoanStatus.REQUESTED]: { label: 'Requested', tone: 'warning' },
  [LoanStatus.APPROVED]: { label: 'Approved', tone: 'accent' },
  [LoanStatus.DECLINED]: { label: 'Declined', tone: 'neutral' },
  [LoanStatus.CANCELLED]: { label: 'Cancelled', tone: 'neutral' },
  [LoanStatus.RETURNED]: { label: 'Returned', tone: 'neutral' },
};

/** Overdue outranks the stored status: it is what either party needs to act on. */
export function statusLook(status: LoanStatus, isOverdue: boolean) {
  return isOverdue ? { label: 'Overdue', tone: 'danger' as const } : STATUS_LOOK[status];
}
