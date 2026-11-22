'use client';

import { useSyncExternalStore } from 'react';

import { readToday, subscribeToDayChange } from './day-store';

import type { IsoDate } from '@lendloop/contracts';

function readNothingOnServer(): null {
  return null;
}

/**
 * Today's date (UTC) that rolls over at midnight, or null while prerendering: the clock is read
 * only in the browser. Convex queries take it as an argument (skipped while null), so their cached
 * subscriptions refresh when the day changes.
 */
export function useToday(): IsoDate | null {
  return useSyncExternalStore(subscribeToDayChange, readToday, readNothingOnServer);
}
