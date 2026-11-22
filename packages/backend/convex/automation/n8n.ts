import {
  notificationAckSchema,
  overdueLoansRequestSchema,
  overdueLoansResponseSchema,
  reminderWriteBackSchema,
  todayUtc,
  workflowErrorReportSchema,
} from '@lendloop/contracts';
import { z } from 'zod';

import { internalMutation } from '../functions';

import {
  listOverdueLoans,
  OVERDUE_WORKFLOW,
  recordHeartbeat,
  recordNotificationAck,
  recordReminder,
  recordWorkflowError,
} from './write_backs';

/** The overdue workflow checks in and gets today's reminders; the check-in is its heartbeat. */
export const overdueLoans = internalMutation({
  args: overdueLoansRequestSchema,
  returns: overdueLoansResponseSchema,
  handler: async (ctx) => {
    await recordHeartbeat(ctx, OVERDUE_WORKFLOW);
    return { loans: await listOverdueLoans(ctx, todayUtc()) };
  },
});

export const reminderResult = internalMutation({
  args: reminderWriteBackSchema,
  returns: z.null(),
  handler: async (ctx, report) => {
    await recordReminder(ctx, report);
    return null;
  },
});

export const notificationResult = internalMutation({
  args: notificationAckSchema,
  returns: z.null(),
  handler: async (ctx, report) => {
    await recordNotificationAck(ctx, report);
    return null;
  },
});

export const workflowError = internalMutation({
  args: workflowErrorReportSchema,
  returns: z.null(),
  handler: async (ctx, report) => {
    await recordWorkflowError(ctx, report);
    return null;
  },
});
