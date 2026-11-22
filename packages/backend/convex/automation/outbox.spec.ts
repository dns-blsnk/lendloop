import {
  EVENT_ID_HEADER,
  LoanAction,
  LoanEventType,
  loanEventPayloadSchema,
  SIGNATURE_HEADER,
  signatureProblem,
  TIMESTAMP_HEADER,
  todayUtc,
} from '@lendloop/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { drill } from '../../test/fixtures';
import { setup, signUp } from '../../test/harness';
import { api, internal } from '../_generated/api';

import { MAX_ATTEMPTS, RETRY_DELAYS_MS } from './delivery';

import type { Id } from '../_generated/dataModel';

const SECRET = 'c'.repeat(64);
const owner = { subject: 'owner', email: 'owner@example.com', name: 'Olga Owner' };
const borrower = { subject: 'borrower', email: 'borrower@example.com', name: 'Bob Borrower' };
const tomorrow = todayUtc(Date.now() + 86_400_000);

interface Sent {
  url: string;
  headers: Record<string, string>;
  body: string;
}

function stubN8n(status: number) {
  const sent: Sent[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: { headers: Record<string, string>; body: string }) => {
      sent.push({ url, headers: init.headers, body: init.body });
      return Promise.resolve(new Response(null, { status }));
    }),
  );
  return sent;
}

async function world() {
  const t = setup();
  const asOwner = await signUp(t, owner);
  const asBorrower = await signUp(t, borrower);
  const toolId = await asOwner.mutation(api.tools.mutations.create, drill);
  const loanId = await asBorrower.mutation(api.loans.mutations.request, {
    toolId,
    startDate: tomorrow,
    endDate: tomorrow,
  });
  const events = () => t.run((ctx) => ctx.db.query('outboundEvents').collect());
  return { t, asOwner, asBorrower, loanId, events };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('N8N_WEBHOOK_BASE_URL', 'http://n8n.test/webhook');
  vi.stubEnv('CONVEX_TO_N8N_SECRET', SECRET);
  vi.stubEnv('N8N_TO_CONVEX_SECRET', 'd'.repeat(64));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('notification outbox', () => {
  it('tells the owner about a new request with a signed, minimal payload', async () => {
    const sent = stubN8n(200);
    const { t, events } = await world();
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(sent).toHaveLength(1);
    const [request] = sent as [Sent];
    expect(request.url).toBe('http://n8n.test/webhook/lendloop-loan-event');
    const payload = loanEventPayloadSchema.strict().parse(JSON.parse(request.body));
    expect(payload).toMatchObject({
      type: LoanEventType.REQUESTED,
      recipient: { firstName: 'Olga', email: owner.email },
      loan: { toolName: drill.name },
    });
    expect(request.body).not.toContain(borrower.email);
    expect(request.headers[EVENT_ID_HEADER]).toBe(payload.eventId);
    expect(
      await signatureProblem(SECRET, {
        timestamp: request.headers[TIMESTAMP_HEADER] ?? null,
        signature: request.headers[SIGNATURE_HEADER] ?? null,
        body: request.body,
      }),
    ).toBeNull();
    expect((await events())[0]).toMatchObject({ status: 'delivered', attempts: 1 });
  });

  it('tells the borrower when the owner approves', async () => {
    const sent = stubN8n(200);
    const { t, asOwner, loanId } = await world();
    await asOwner.mutation(api.loans.mutations.act, { loanId, action: LoanAction.APPROVE });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const approved = sent
      .map((request) => loanEventPayloadSchema.parse(JSON.parse(request.body)))
      .find((payload) => payload.type === LoanEventType.APPROVED);
    expect(approved?.recipient.email).toBe(borrower.email);
  });

  it(`retries with backoff and gives up after ${String(MAX_ATTEMPTS)} attempts`, async () => {
    const sent = stubN8n(503);
    const { t, events } = await world();
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(sent).toHaveLength(RETRY_DELAYS_MS.length + 1);
    expect((await events())[0]).toMatchObject({
      status: 'failed',
      attempts: MAX_ATTEMPTS,
      lastError: 'n8n answered HTTP 503.',
    });
  });

  it('never sends a delivered event again', async () => {
    const sent = stubN8n(200);
    const { t, events } = await world();
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const [event] = await events();
    await t.action(internal.automation.outbox.deliver, {
      eventId: (event as { _id: Id<'outboundEvents'> })._id,
    });
    expect(sent).toHaveLength(1);
  });

  it('waits and retries while n8n is not configured', async () => {
    vi.stubEnv('N8N_WEBHOOK_BASE_URL', '');
    const sent = stubN8n(200);
    const { t, events } = await world();
    const [event] = await events();
    await t.action(internal.automation.outbox.deliver, {
      eventId: (event as { _id: Id<'outboundEvents'> })._id,
    });
    expect(sent).toHaveLength(0);
    expect((await events())[0]).toMatchObject({
      status: 'pending',
      attempts: 0,
      lastError: 'n8n is not configured.',
    });
  });

  it('re-schedules an event whose delivery job was lost', async () => {
    const sent = stubN8n(200);
    const { t, events } = await world();
    // Drop the scheduled delivery: the event stays pending, as after a crashed action.
    await t.run(async (ctx) => {
      for (const job of await ctx.db.system.query('_scheduled_functions').collect()) {
        await ctx.scheduler.cancel(job._id);
      }
    });
    vi.advanceTimersByTime(10 * 60_000);
    expect(await t.mutation(internal.automation.outbox.sweep, {})).toEqual({ rescheduled: 1 });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(sent).toHaveLength(1);
    expect((await events())[0]?.status).toBe('delivered');
  });

  it('writes no event when the loan change itself fails', async () => {
    stubN8n(200);
    const { asBorrower, loanId, events } = await world();
    const before = (await events()).length;
    await expect(
      asBorrower.mutation(api.loans.mutations.act, { loanId, action: LoanAction.APPROVE }),
    ).rejects.toThrow();
    expect(await events()).toHaveLength(before);
  });

  it('gives up at once on a permanent client error such as a bad signature', async () => {
    const sent = stubN8n(401);
    const { t, events } = await world();
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(sent).toHaveLength(1);
    expect((await events())[0]).toMatchObject({ status: 'failed', attempts: 1 });
  });

  it('describes the change as it was when it happened, even when sent late', async () => {
    const sent = stubN8n(200);
    const { t, asBorrower, loanId } = await world();
    await asBorrower.mutation(api.loans.mutations.act, { loanId, action: LoanAction.CANCEL });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const requested = sent
      .map((request) => loanEventPayloadSchema.parse(JSON.parse(request.body)))
      .find((payload) => payload.type === LoanEventType.REQUESTED);
    expect(requested?.loan.status).toBe('requested');
  });

  it('gives up after the last attempt even when attempts crash before reporting', async () => {
    stubN8n(200);
    const { t, events } = await world();
    await t.run(async (ctx) => {
      const [event] = await ctx.db.query('outboundEvents').collect();
      if (event !== undefined) {
        await ctx.db.patch('outboundEvents', event._id, { attempts: MAX_ATTEMPTS });
      }
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await events())[0]).toMatchObject({ status: 'failed', lastError: 'No attempts left.' });
  });
});
