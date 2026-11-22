const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

const plural = (count: number, unit: string) => `${String(count)} ${unit}${count === 1 ? '' : 's'}`;

/** "just now", "5 minutes ago", "3 hours ago", "2 days ago". */
export function formatRelative(at: number, now: number): string {
  const elapsed = Math.max(0, now - at);
  if (elapsed < MINUTE_MS) {
    return 'just now';
  }
  if (elapsed < HOUR_MS) {
    return `${plural(Math.floor(elapsed / MINUTE_MS), 'minute')} ago`;
  }
  if (elapsed < DAY_MS) {
    return `${plural(Math.floor(elapsed / HOUR_MS), 'hour')} ago`;
  }
  return `${plural(Math.floor(elapsed / DAY_MS), 'day')} ago`;
}
