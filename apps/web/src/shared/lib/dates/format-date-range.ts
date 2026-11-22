import type { IsoDate } from '@lendloop/contracts';

const DAY_MONTH = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const yearOf = (date: IsoDate) => date.slice(0, '2026'.length);

/** "3 Dec – 5 Dec", with years once the range leaves the current year. Dates are UTC days. */
export function formatDateRange(startDate: IsoDate, endDate: IsoDate, today: IsoDate): string {
  const sameYear = yearOf(startDate) === yearOf(today) && yearOf(endDate) === yearOf(today);
  const format = (date: IsoDate) =>
    (sameYear ? DAY_MONTH : DAY_MONTH_YEAR).format(new Date(`${date}T00:00:00Z`));
  return startDate === endDate ? format(startDate) : `${format(startDate)} – ${format(endDate)}`;
}
