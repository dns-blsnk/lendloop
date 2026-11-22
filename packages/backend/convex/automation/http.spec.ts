import {
  DeliveryStatus,
  LoanStatus,
  MAX_N8N_REQUEST_BYTES,
  N8N_ENDPOINTS,
  overdueLoansResponseSchema,
  reminderKey,
  sign,
  SIGNATURE_HEADER,
  SIGNATURE_TOLERANCE_SECONDS,
  TIMESTAMP_HEADER,
  todayUtc,
  unixSeconds,
} from '@lendloop/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { drill, insertLoan, userIdByEmail } from '../../test/fixtures';
import { setup, signUp } from '../../test/harness';
import { api } from '../_generated/api';

import type { TestConvex } from '../../test/harness';

const SECRET = 'n'.repeat(64);
const today = todayUtc();
const owner = { subject: 'owner', email: 'owner@example.com', name: 'Olga Owner' };
const borrower = { subject: 'borrower', email: 'borrower@example.com', name: 'Bob Borrower' };

async function post(
  t: TestConvex,
  path: string,
  body: unknown,
  options: { secret?: string; timestamp?: number } = {},
) {
  const raw = JSON.stringify(body);
  const timestamp = options.timestamp ?? unixSeconds();
  return t.fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [TIMESTAMP_HEADER]: String(timestamp),
      [SIGNATURE_HEADER]: await sign(options.secret ?? SECRET, timestamp, raw),
    },
    body: raw,
  });
}

async function withOverdueLoan() {
  const t = setup();
  const asOwner = await signUp(t, owner);
  await signUp(t, borrower);
  const toolId = await asOwner.mutation(api.tools.mutations.create, drill);
  const borrowerId = await userIdByEmail(t, borrower.email);
  const loanId = await insertLoan(t, {
    toolId,
    borrowerId,
    startDate: '2020-01-01',
    endDate: '2020-01-03',
    status: LoanStatus.APPROVED,
  });
  return { t, loanId };
}

beforeEach(() => {
  vi.stubEnv('N8N_WEBHOOK_BASE_URL', 'http://n8n.test/webhook');
  vi.stubEnv('CONVEX_TO_N8N_SECRET', 'c'.repeat(64));
  vi.stubEnv('N8N_TO_CONVEX_SECRET', SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('signed n8n endpoints', () => {
  it('rejects a wrong secret, a stale timestamp and an unsigned call', async () => {
    const { t } = await withOverdueLoan();
    const body = {};
    expect(
      (await post(t, N8N_ENDPOINTS.OVERDUE_LOANS, body, { secret: 'x'.repeat(64) })).status,
    ).toBe(401);
    const stale = unixSeconds() - SIGNATURE_TOLERANCE_SECONDS - 1;
    expect((await post(t, N8N_ENDPOINTS.OVERDUE_LOANS, body, { timestamp: stale })).status).toBe(
      401,
    );
    const unsigned = await t.fetch(N8N_ENDPOINTS.OVERDUE_LOANS, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    expect(unsigned.status).toBe(401);
  });

  it('rejects bodies that are too large or do not match the contract', async () => {
    const { t } = await withOverdueLoan();
    const huge = { padding: 'x'.repeat(MAX_N8N_REQUEST_BYTES) };
    expect((await post(t, N8N_ENDPOINTS.OVERDUE_LOANS, huge)).status).toBe(413);
    expect((await post(t, N8N_ENDPOINTS.OVERDUE_LOANS, { date: 'yesterday' })).status).toBe(400);
    expect((await post(t, N8N_ENDPOINTS.REMINDERS, { loanId: 1 })).status).toBe(400);
  });

  it('lists overdue loans with only what a reminder needs and records the heartbeat', async () => {
    const { t, loanId } = await withOverdueLoan();
    const response = await post(t, N8N_ENDPOINTS.OVERDUE_LOANS, {});
    expect(response.status).toBe(200);
    const { loans } = overdueLoansResponseSchema.strict().parse(await response.json());
    expect(loans).toEqual([
      expect.objectContaining({
        loanId,
        reminderKey: reminderKey(loanId, today),
        borrower: { firstName: 'Bob', email: borrower.email },
        toolName: drill.name,
      }),
    ]);
    expect(JSON.stringify(loans)).not.toContain(owner.email);
    const heartbeats = await t.run((ctx) => ctx.db.query('automationHeartbeats').collect());
    expect(heartbeats).toEqual([expect.objectContaining({ name: 'overdue-reminders' })]);
  });

  it('records a reminder once however often n8n retries, and stops listing the loan', async () => {
    const { t, loanId } = await withOverdueLoan();
    const report = { loanId, reminderKey: reminderKey(loanId, today), status: DeliveryStatus.SENT };
    expect((await post(t, N8N_ENDPOINTS.REMINDERS, report)).status).toBe(200);
    expect((await post(t, N8N_ENDPOINTS.REMINDERS, report)).status).toBe(200);
    await post(t, N8N_ENDPOINTS.REMINDERS, { ...report, status: DeliveryStatus.FAILED });
    const activity = await t.run((ctx) => ctx.db.query('automationActivity').collect());
    expect(activity).toEqual([
      expect.objectContaining({ status: DeliveryStatus.SENT, kind: 'reminder' }),
    ]);
    const next = await post(t, N8N_ENDPOINTS.OVERDUE_LOANS, {});
    expect(overdueLoansResponseSchema.parse(await next.json()).loans).toEqual([]);
  });

  it('refuses a reminder key that names another loan', async () => {
    const { t, loanId } = await withOverdueLoan();
    const report = {
      loanId,
      reminderKey: 'reminder:someone-else:2026-01-01',
      status: DeliveryStatus.SENT,
    };
    expect((await post(t, N8N_ENDPOINTS.REMINDERS, report)).status).toBe(400);
  });

  it('records notification results against the event and ignores unknown events', async () => {
    const { t } = await withOverdueLoan();
    const asBorrower = await signUp(t, { ...borrower, subject: 'borrower' });
    const [tool] = await t.run((ctx) => ctx.db.query('tools').collect());
    await asBorrower.mutation(api.loans.mutations.request, {
      toolId: tool?._id as never,
      startDate: todayUtc(Date.now() + 86_400_000 * 40),
      endDate: todayUtc(Date.now() + 86_400_000 * 40),
    });
    const [event] = await t.run((ctx) => ctx.db.query('outboundEvents').collect());
    const ack = { eventId: event?._id, status: DeliveryStatus.SENT };
    expect((await post(t, N8N_ENDPOINTS.NOTIFICATION_ACKS, ack)).status).toBe(200);
    expect((await post(t, N8N_ENDPOINTS.NOTIFICATION_ACKS, ack)).status).toBe(200);
    const activity = await t.run((ctx) => ctx.db.query('automationActivity').collect());
    expect(activity).toEqual([
      expect.objectContaining({ kind: 'notification', eventType: 'loan.requested' }),
    ]);
    expect(
      (await post(t, N8N_ENDPOINTS.NOTIFICATION_ACKS, { eventId: 'nope', status: 'sent' })).status,
    ).toBe(400);
  });

  it('stores each workflow error once', async () => {
    const { t } = await withOverdueLoan();
    const report = {
      executionId: '42',
      workflow: 'Overdue reminders',
      node: 'Send email',
      message: 'SMTP down',
    };
    await post(t, N8N_ENDPOINTS.WORKFLOW_ERRORS, report);
    await post(t, N8N_ENDPOINTS.WORKFLOW_ERRORS, report);
    expect(await t.run((ctx) => ctx.db.query('workflowErrors').collect())).toHaveLength(1);
  });

  it('answers like a bad signature while the integration is not configured', async () => {
    vi.stubEnv('N8N_TO_CONVEX_SECRET', '');
    const { t } = await withOverdueLoan();
    expect((await post(t, N8N_ENDPOINTS.OVERDUE_LOANS, {})).status).toBe(401);
  });

  it('settles the outbox when n8n reports a notification as sent', async () => {
    const { t } = await withOverdueLoan();
    const asBorrower = await signUp(t, borrower);
    const [tool] = await t.run((ctx) => ctx.db.query('tools').collect());
    await asBorrower.mutation(api.loans.mutations.request, {
      toolId: tool?._id as never,
      startDate: todayUtc(Date.now() + 86_400_000 * 40),
      endDate: todayUtc(Date.now() + 86_400_000 * 40),
    });
    const [event] = await t.run((ctx) => ctx.db.query('outboundEvents').collect());
    await post(t, N8N_ENDPOINTS.NOTIFICATION_ACKS, {
      eventId: event?._id,
      status: DeliveryStatus.SENT,
    });
    const [after] = await t.run((ctx) => ctx.db.query('outboundEvents').collect());
    expect(after?.status).toBe('delivered');
  });

  it('lists loans beyond the first batch once the earlier ones are reminded', async () => {
    const { t, loanId } = await withOverdueLoan();
    await post(t, N8N_ENDPOINTS.REMINDERS, {
      loanId,
      reminderKey: reminderKey(loanId, today),
      status: DeliveryStatus.SENT,
    });
    const [tool] = await t.run((ctx) => ctx.db.query('tools').collect());
    const borrowerId = await userIdByEmail(t, borrower.email);
    const second = await insertLoan(t, {
      toolId: tool?._id as never,
      borrowerId,
      startDate: '2020-02-01',
      endDate: '2020-02-03',
      status: LoanStatus.APPROVED,
    });
    const next = await post(t, N8N_ENDPOINTS.OVERDUE_LOANS, {});
    expect(
      overdueLoansResponseSchema.parse(await next.json()).loans.map((loan) => loan.loanId),
    ).toEqual([second]);
  });
});
