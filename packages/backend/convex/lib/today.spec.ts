import { todayUtc } from '@lendloop/contracts';
import { describe, expect, it } from 'vitest';

import { displayDay } from './today';

const shift = (days: number) => todayUtc(Date.now() + days * 86_400_000);

describe('displayDay', () => {
  it('uses the client day when it is within one day of the server', () => {
    expect(displayDay(shift(1))).toBe(shift(1));
    expect(displayDay(shift(-1))).toBe(shift(-1));
  });

  it('falls back to the server day for anything further away', () => {
    expect(displayDay('2000-01-01')).toBe(todayUtc());
    expect(displayDay(shift(3))).toBe(todayUtc());
  });
});
