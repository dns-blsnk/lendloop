import { describe, expect, it } from 'vitest';

import { parseReminderKey, reminderKey } from './http';

describe('reminder keys', () => {
  it('round-trips a loan id and a day', () => {
    expect(parseReminderKey(reminderKey('abc123', '2026-11-22'))).toEqual({
      loanId: 'abc123',
      date: '2026-11-22',
    });
  });

  it('rejects anything that is not exactly a reminder key with a real day', () => {
    expect(parseReminderKey('notification:abc')).toBeNull();
    expect(parseReminderKey('reminder:abc:garbage')).toBeNull();
    expect(parseReminderKey('reminder:abc:2026-11-22:extra')).toBeNull();
  });
});
