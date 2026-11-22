import { z } from 'zod';

import { isoDateSchema } from './dates';
import { loanEventTypeSchema } from './integration/event-types';
import { loanStatusSchema } from './loans';
import { roleSchema } from './roles';

/** Most loans the admin list returns at once; filter by status to narrow it. */
export const MAX_ADMIN_LOANS = 500;

/** Most users the admin list returns at once. */
export const MAX_ADMIN_USERS = 500;

/** Most listings the admin list returns at once. */
export const MAX_ADMIN_TOOLS = 500;

/** Listings counted per user; the admin only needs to tell "a few" from "many". */
export const MAX_COUNTED_LISTINGS = 100;

/** A loan in the admin overview: who and what by name, never emails. The backend adds ids. */
export const adminLoanSchema = z.object({
  status: loanStatusSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  isOverdue: z.boolean(),
  toolName: z.string(),
  ownerName: z.string(),
  borrowerName: z.string(),
});

export type AdminLoan = z.infer<typeof adminLoanSchema>;

/**
 * A user in the admin overview, enough to decide on the Trusted Lender badge. The join date tells
 * apart people with the same name without showing their email.
 */
export const adminUserSchema = z.object({
  name: z.string(),
  role: roleSchema,
  isTrustedLender: z.boolean(),
  joinedOn: isoDateSchema,
  activeListings: z.number(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

/** A capped admin list says when it was cut, so the UI can ask for a narrower filter. */
export function cappedListSchema<Item extends z.ZodType>(item: Item) {
  return z.object({ items: z.array(item), isTruncated: z.boolean() });
}

/**
 * The overdue workflow runs daily; no check-in for longer than this (25 hours: a daily run plus an
 * hour of slack) means it has stopped.
 */
export const HEARTBEAT_STALE_AFTER_MS = 90_000_000;

/** Most failed events and workflow errors the health page lists. */
export const MAX_HEALTH_ITEMS = 20;

/** Admin view of the n8n integration: is it running, and what failed. */
export const automationHealthSchema = z.object({
  /** When the overdue workflow last checked in; the UI compares it with HEARTBEAT_STALE_AFTER_MS. */
  overdueWorkflow: z.object({ lastRunAt: z.number().nullable() }),
  /** Pending events, counted up to a cap; `isCapped` means "at least". */
  pendingEvents: z.object({ count: z.number(), isCapped: z.boolean() }),
  failedEvents: z.array(
    z.object({
      id: z.string(),
      type: loanEventTypeSchema,
      attempts: z.number(),
      lastError: z.string(),
      at: z.number(),
    }),
  ),
  workflowErrors: z.array(
    z.object({
      executionId: z.string(),
      workflow: z.string(),
      node: z.string().optional(),
      message: z.string(),
      at: z.number(),
    }),
  ),
});

export type AutomationHealth = z.infer<typeof automationHealthSchema>;

export function isHeartbeatStale(lastRunAt: number | null, now: number): boolean {
  return lastRunAt === null || now - lastRunAt > HEARTBEAT_STALE_AFTER_MS;
}
