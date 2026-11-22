import { z } from 'zod';

import { isoDateSchema } from '../dates';

/**
 * Convex HTTP endpoints n8n calls. Every request is a signed POST (see signature.ts) with the
 * n8n-to-Convex secret; even "fetch" calls are POSTs so the body that is signed is never empty.
 */
export const N8N_ENDPOINTS = {
  OVERDUE_LOANS: '/n8n/overdue-loans',
  REMINDERS: '/n8n/reminders',
  NOTIFICATION_ACKS: '/n8n/notification-acks',
  WORKFLOW_ERRORS: '/n8n/workflow-errors',
} as const;

/** The n8n webhook path Convex posts loan events to (under N8N_WEBHOOK_BASE_URL). */
export const N8N_WEBHOOK_PATH = 'lendloop-loan-event';

/** Largest request body accepted from n8n. */
export const MAX_N8N_REQUEST_BYTES = 16_384;

export const DeliveryStatus = {
  SENT: 'sent',
  FAILED: 'failed',
} as const;

export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

export const deliveryStatusSchema = z.enum(DeliveryStatus);

const MAX_ERROR_TEXT = 300;
const MAX_NAME_TEXT = 120;

/**
 * The overdue-reminder workflow asks for today's list. The body is empty: "today" is the server's
 * day, never the caller's, so a wrong clock in n8n cannot mint reminders for another day.
 */
export const overdueLoansRequestSchema = z.object({}).strict();

/**
 * One reminder to send. `reminderKey` is unique per loan and day: writing the result back twice
 * (a retry) never creates a second record, and a loan reminded today is not listed again.
 */
export const overdueLoanSchema = z.object({
  loanId: z.string(),
  reminderKey: z.string(),
  borrower: z.object({ firstName: z.string(), email: z.email() }),
  toolName: z.string(),
  endDate: isoDateSchema,
  daysOverdue: z.number().int().positive(),
});

export type OverdueLoan = z.infer<typeof overdueLoanSchema>;

export const overdueLoansResponseSchema = z.object({ loans: z.array(overdueLoanSchema) });

export const reminderWriteBackSchema = z.object({
  loanId: z.string(),
  reminderKey: z.string(),
  status: deliveryStatusSchema,
  error: z.string().max(MAX_ERROR_TEXT).optional(),
});

export const notificationAckSchema = z.object({
  eventId: z.string(),
  status: deliveryStatusSchema,
  error: z.string().max(MAX_ERROR_TEXT).optional(),
});

/** What the error workflow reports: where it failed, never the payload of the failed run. */
export const workflowErrorReportSchema = z.object({
  executionId: z.string().max(MAX_NAME_TEXT),
  workflow: z.string().max(MAX_NAME_TEXT),
  node: z.string().max(MAX_NAME_TEXT).optional(),
  message: z.string().max(MAX_ERROR_TEXT),
});

/** What n8n reports back on: a notification it sent, or an overdue reminder. */
export const ActivityKind = {
  NOTIFICATION: 'notification',
  REMINDER: 'reminder',
} as const;

export type ActivityKind = (typeof ActivityKind)[keyof typeof ActivityKind];

export const activityKindSchema = z.enum(ActivityKind);

/** The reminder key for a loan on a day: `reminder:<loanId>:<YYYY-MM-DD>`. */
export function reminderKey(loanId: string, date: string): string {
  return `${ActivityKind.REMINDER}:${loanId}:${date}`;
}

/** Splits a reminder key into its loan id and day, or null when it is not one. */
export function parseReminderKey(key: string): { loanId: string; date: string } | null {
  const [kind, loanId, date, ...rest] = key.split(':');
  if (
    kind !== ActivityKind.REMINDER ||
    loanId === undefined ||
    date === undefined ||
    rest.length > 0
  ) {
    return null;
  }
  return isoDateSchema.safeParse(date).success ? { loanId, date } : null;
}

/** The activity key for a delivered notification event. */
export function notificationKey(eventId: string): string {
  return `${ActivityKind.NOTIFICATION}:${eventId}`;
}
