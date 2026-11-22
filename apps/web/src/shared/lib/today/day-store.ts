import { msUntilNextUtcDay, todayUtc } from '@lendloop/contracts';

import type { IsoDate } from '@lendloop/contracts';

/**
 * Calls `onDayChange` at every UTC midnight and whenever the tab becomes visible again: timers in
 * background tabs and on sleeping laptops fire late, so a returning user re-reads the date at once.
 */
export function subscribeToDayChange(onDayChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    timer = setTimeout(() => {
      onDayChange();
      schedule();
    }, msUntilNextUtcDay(Date.now()));
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      onDayChange();
    }
  };
  schedule();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

export function readToday(): IsoDate {
  return todayUtc();
}
