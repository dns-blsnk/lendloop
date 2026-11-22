import { z } from 'zod';

import { isoDateSchema } from '../dates';
import { loanStatusSchema } from '../loans';

import { loanEventTypeSchema } from './event-types';

/**
 * The webhook body Convex sends to n8n. Only what an email needs: the recipient's first name and
 * address, the tool's name and the dates. No user ids, no other party's contact details.
 */
export const loanEventPayloadSchema = z.object({
  eventId: z.string(),
  type: loanEventTypeSchema,
  occurredAt: z.iso.datetime(),
  recipient: z.object({ firstName: z.string(), email: z.email() }),
  loan: z.object({
    toolName: z.string(),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    status: loanStatusSchema,
  }),
});

export type LoanEventPayload = z.infer<typeof loanEventPayloadSchema>;
