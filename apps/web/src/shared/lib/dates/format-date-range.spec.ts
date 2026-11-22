import { describe, expect, it } from 'vitest';

import { formatDateRange } from './format-date-range';

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
