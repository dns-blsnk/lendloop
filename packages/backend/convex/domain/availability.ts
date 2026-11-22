import { Availability, LoanStatus } from '@lendloop/contracts';

import type { IsoDate, LoanStatus as LoanStatusType } from '@lendloop/contracts';

interface LoanDates {
  status: LoanStatusType;
  startDate: IsoDate;
  endDate: IsoDate;
}

/** An approved loan whose first day has come: the borrower has (or should have) the tool. */
export function isUnderWay(loan: LoanDates, today: IsoDate): boolean {
  return loan.status === LoanStatus.APPROVED && loan.startDate <= today;
}

/** Approved loans whose last day has passed: they should have come back by now. */
export function isOverdue(loan: LoanDates, today: IsoDate): boolean {
  return loan.status === LoanStatus.APPROVED && loan.endDate < today;
}

/**
 * A tool is out while an approved loan is under way; if any of those is past its end date it is
 * overdue. Approved loans that start later leave the tool available today.
 */
export function availabilityOf(loans: readonly LoanDates[], today: IsoDate): Availability {
  const underWay = loans.filter((loan) => isUnderWay(loan, today));
  if (underWay.length === 0) {
    return Availability.AVAILABLE;
  }
  return underWay.some((loan) => isOverdue(loan, today))
    ? Availability.OVERDUE
    : Availability.ON_LOAN;
}
