import { describe, expect, it } from 'vitest';

import { formatRelative } from './format-relative';

const NOW = Date.UTC(2026, 10, 22, 12, 0, 0);

describe('formatRelative', () => {
  it('reads like a person would say it', () => {
    expect(formatRelative(NOW - 10_000, NOW)).toBe('just now');
    expect(formatRelative(NOW - 60_000, NOW)).toBe('1 minute ago');
    expect(formatRelative(NOW - 5 * 3_600_000, NOW)).toBe('5 hours ago');
    expect(formatRelative(NOW - 2 * 86_400_000, NOW)).toBe('2 days ago');
  });

  it('never says "in the future" when clocks differ slightly', () => {
    expect(formatRelative(NOW + 5_000, NOW)).toBe('just now');
  });
});
