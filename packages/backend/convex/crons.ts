import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

// Just after midnight UTC, when yesterday's unanswered requests become stale.
crons.daily(
  'expire stale loan requests',
  { hourUTC: 0, minuteUTC: 7 },
  internal.loans.internal.expireStale,
);

export default crons;
