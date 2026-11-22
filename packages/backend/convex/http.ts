import {
  N8N_ENDPOINTS,
  notificationAckSchema,
  overdueLoansRequestSchema,
  reminderWriteBackSchema,
  workflowErrorReportSchema,
} from '@lendloop/contracts';
import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { signedEndpoint } from './automation';

const http = httpRouter();

http.route({
  path: N8N_ENDPOINTS.OVERDUE_LOANS,
  method: 'POST',
  handler: signedEndpoint(overdueLoansRequestSchema, (ctx, body) =>
    ctx.runMutation(internal.automation.n8n.overdueLoans, body),
  ),
});

http.route({
  path: N8N_ENDPOINTS.REMINDERS,
  method: 'POST',
  handler: signedEndpoint(reminderWriteBackSchema, (ctx, body) =>
    ctx.runMutation(internal.automation.n8n.reminderResult, body),
  ),
});

http.route({
  path: N8N_ENDPOINTS.NOTIFICATION_ACKS,
  method: 'POST',
  handler: signedEndpoint(notificationAckSchema, (ctx, body) =>
    ctx.runMutation(internal.automation.n8n.notificationResult, body),
  ),
});

http.route({
  path: N8N_ENDPOINTS.WORKFLOW_ERRORS,
  method: 'POST',
  handler: signedEndpoint(workflowErrorReportSchema, (ctx, body) =>
    ctx.runMutation(internal.automation.n8n.workflowError, body),
  ),
});

export default http;
