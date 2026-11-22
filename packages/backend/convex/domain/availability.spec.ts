import { Availability, LoanStatus } from '@lendloop/contracts';
import { describe, expect, it } from 'vitest';

import { availabilityOf, isOverdue } from './availability';

const TODAY = '2026-12-10';
const loan = (status: LoanStatus, startDate: string, endDate: string) => ({
  status,
  startDate,
  endDate,
});

describe('availabilityOf', () => {
  it('is available with no loans or only future approved loans', () => {
    expect(availabilityOf([], TODAY)).toBe(Availability.AVAILABLE);
    expect(availabilityOf([loan(LoanStatus.APPROVED, '2026-12-11', '2026-12-12')], TODAY)).toBe(
      Availability.AVAILABLE,
    );
  });

  it('ignores requests and finished loans', () => {
    const loans = [
      loan(LoanStatus.REQUESTED, '2026-12-01', '2026-12-20'),
      loan(LoanStatus.RETURNED, '2026-12-01', '2026-12-20'),
    ];
    expect(availabilityOf(loans, TODAY)).toBe(Availability.AVAILABLE);
  });

  it('is on loan from the first day to the last day of an approved loan', () => {
    expect(availabilityOf([loan(LoanStatus.APPROVED, TODAY, TODAY)], TODAY)).toBe(
      Availability.ON_LOAN,
    );
  });

  it('is overdue once the last day has passed without a return', () => {
    const late = loan(LoanStatus.APPROVED, '2026-12-01', '2026-12-09');
    expect(availabilityOf([late], TODAY)).toBe(Availability.OVERDUE);
    expect(isOverdue(late, TODAY)).toBe(true);
  });
});

describe('availabilityOf with several loans', () => {
  it('reports overdue when any loan under way is late, whatever the order', () => {
    const late = loan(LoanStatus.APPROVED, '2026-12-01', '2026-12-05');
    const current = loan(LoanStatus.APPROVED, '2026-12-08', '2026-12-12');
    expect(availabilityOf([current, late], TODAY)).toBe(Availability.OVERDUE);
    expect(availabilityOf([late, current], TODAY)).toBe(Availability.OVERDUE);
  });
});
