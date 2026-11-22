import { LoanStatus } from '@lendloop/contracts';
import { describe, expect, it } from 'vitest';

import { formatDateRange, statusLook } from './format';

describe('formatDateRange', () => {
  it('shows day and month within the current year', () => {
    expect(formatDateRange('2026-12-03', '2026-12-05', '2026-11-22')).toBe('3 Dec – 5 Dec');
    expect(formatDateRange('2026-12-03', '2026-12-03', '2026-11-22')).toBe('3 Dec');
  });

  it('adds years when the range is not in the current year', () => {
    expect(formatDateRange('2026-12-30', '2027-01-03', '2026-11-22')).toBe(
      '30 Dec 2026 – 3 Jan 2027',
    );
    expect(formatDateRange('2025-05-01', '2025-05-02', '2026-11-22')).toBe(
      '1 May 2025 – 2 May 2025',
    );
  });
});

describe('statusLook', () => {
  it('lets overdue outrank the stored status', () => {
    expect(statusLook(LoanStatus.APPROVED, true)).toEqual({ label: 'Overdue', tone: 'danger' });
    expect(statusLook(LoanStatus.APPROVED, false).label).toBe('Approved');
  });
});
