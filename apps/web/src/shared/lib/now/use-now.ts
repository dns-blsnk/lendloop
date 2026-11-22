'use client';

import { useSyncExternalStore } from 'react';

/** How often relative times ("5 minutes ago") refresh. */
const TICK_MS = 60_000;

/**
 * One clock for the whole page: the first subscriber starts a single interval, the last one stops
 * it, so a list of many rows does not run a timer per row.
 */
const listeners = new Set<() => void>();
let current = 0;
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(onTick: () => void): () => void {
  if (listeners.size === 0) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      for (const listener of listeners) {
        listener();
      }
    }, TICK_MS);
  }
  listeners.add(onTick);
  return () => {
    listeners.delete(onTick);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * The shared tick. With nothing subscribed (a first render, possibly after a long pause) it is
 * refreshed once it is a tick old, but stays the same between React's repeated reads.
 */
function readNow(): number {
  if (listeners.size === 0 && Date.now() - current >= TICK_MS) {
    current = Date.now();
  }
  return current;
}

function readNothingOnServer(): null {
  return null;
}

/** The current time, refreshed every minute in the browser; null while prerendering. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, readNow, readNothingOnServer);
}
