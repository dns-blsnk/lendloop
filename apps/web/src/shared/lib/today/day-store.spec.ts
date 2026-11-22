// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { subscribeToDayChange } from './day-store';

describe('subscribeToDayChange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 10, 22, 23, 59, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires at midnight and again the next midnight', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToDayChange(onChange);
    vi.advanceTimersByTime(60_000);
    expect(onChange).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(86_400_000);
    expect(onChange).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('fires when the tab becomes visible again', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToDayChange(onChange);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('stops after unsubscribing', () => {
    const onChange = vi.fn();
    subscribeToDayChange(onChange)();
    vi.advanceTimersByTime(86_400_000 * 2);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
