import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

// Just after midnight UTC, when yesterday's unanswered requests become stale.
crons.daily(
  'expire stale loan requests',
  { hourUTC: 0, minuteUTC: 7 },
  internal.loans.internal.expireStale,
);

// Picks up outgoing n8n events whose delivery job was lost.
crons.interval('sweep the notification outbox', { minutes: 10 }, internal.automation.outbox.sweep);

export default crons;
