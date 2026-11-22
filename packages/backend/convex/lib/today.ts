import { daysBetween, todayUtc } from '@lendloop/contracts';

import type { IsoDate } from '@lendloop/contracts';

/** Time zones put the client at most one calendar day away from UTC. */
const MAX_CLIENT_DAY_DRIFT = 1;

/**
 * The day a query should show. Convex caches query results and does not re-run them when the clock
 * passes midnight, so the client passes its day and re-subscribes when it changes. It only shapes
 * what is displayed (mutations use the server clock), and a value far from the server's is ignored.
 */
export function displayDay(clientDay: IsoDate): IsoDate {
  const serverDay = todayUtc();
  return Math.abs(daysBetween(serverDay, clientDay)) <= MAX_CLIENT_DAY_DRIFT
    ? clientDay
    : serverDay;
}
