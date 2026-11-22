import { describe, expect, it } from 'vitest';

import { daysBetween, isoDateSchema, msUntilNextUtcDay, rangesOverlap, todayUtc } from './dates';

describe('dates', () => {
  it('formats today in UTC', () => {
    expect(todayUtc(Date.UTC(2026, 10, 22, 23, 59))).toBe('2026-11-22');
  });

  it('counts whole days across months', () => {
    expect(daysBetween('2026-11-28', '2026-12-02')).toBe(4);
    expect(daysBetween('2026-11-28', '2026-11-28')).toBe(0);
  });

  it('accepts only real calendar days', () => {
    expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-2-3').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-02-28').success).toBe(true);
  });

  it('treats ranges sharing a day as overlapping', () => {
    const a = { startDate: '2026-12-01', endDate: '2026-12-05' };
    expect(rangesOverlap(a, { startDate: '2026-12-05', endDate: '2026-12-07' })).toBe(true);
    expect(rangesOverlap(a, { startDate: '2026-12-06', endDate: '2026-12-07' })).toBe(false);
  });

  it('counts down to the next UTC midnight', () => {
    expect(msUntilNextUtcDay(Date.UTC(2026, 10, 22, 23, 59, 0))).toBe(60_000);
    expect(msUntilNextUtcDay(Date.UTC(2026, 10, 22, 0, 0, 0))).toBe(86_400_000);
  });
});
