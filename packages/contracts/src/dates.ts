import { z } from 'zod';

const MS_PER_DAY = 86_400_000;
/** `YYYY-MM-DD` is the first 10 characters of an ISO timestamp. */
const ISO_DATE_LENGTH = 10;

/**
 * Calendar day as `YYYY-MM-DD`. Loans are whole days without a time zone; "today" is taken in UTC
 * everywhere, which the README states as a known simplification.
 */
export const isoDateSchema = z.iso.date();

export type IsoDate = z.infer<typeof isoDateSchema>;

export function todayUtc(now: number = Date.now()): IsoDate {
  return new Date(now).toISOString().slice(0, ISO_DATE_LENGTH);
}

/** Whole days from `from` to `to`; 0 for the same day, negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY);
}

/** Inclusive ranges overlap when each one starts on or before the other ends. */
export function rangesOverlap(
  a: { startDate: IsoDate; endDate: IsoDate },
  b: { startDate: IsoDate; endDate: IsoDate },
): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}
