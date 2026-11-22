'use client';

import { isHeartbeatStale } from '@lendloop/contracts';
import { useMutation, useQuery } from 'convex/react';

import { api } from '@/shared/api';
import { formatRelative } from '@/shared/lib/dates';
import { useNow } from '@/shared/lib/now';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorText } from '@/shared/ui/error-text';
import { Skeleton } from '@/shared/ui/skeleton';

import { usePendingRow } from './use-pending';

import type { AutomationHealth } from '@lendloop/contracts';

function OverdueWorkflowCard({ lastRunAt, now }: { lastRunAt: number | null; now: number }) {
  const isStale = isHeartbeatStale(lastRunAt, now);
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">Overdue reminders workflow</h3>
        <Badge tone={isStale ? 'danger' : 'accent'}>{isStale ? 'Not running' : 'Running'}</Badge>
      </div>
      <p className="text-sm text-muted">
        {lastRunAt === null
          ? 'It has never checked in. Is n8n running and the workflow published?'
          : `Last checked in ${formatRelative(lastRunAt, now)}.`}
      </p>
    </Card>
  );
}

function FailedEvents({ events, now }: { events: AutomationHealth['failedEvents']; now: number }) {
  const retry = useMutation(api.admin.mutations.retryNotification);
  const { isPending, error, run } = usePendingRow();
  if (events.length === 0) {
    return <EmptyState>No failed notifications.</EmptyState>;
  }
  return (
    <div className="flex flex-col gap-2">
      <ErrorText message={error} />
      <ul className="flex flex-col gap-2">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
          >
            <span>
              <span className="font-medium">{event.type}</span> · {event.lastError} ·{' '}
              {event.attempts} attempts · {formatRelative(event.at, now)}
            </span>
            <Button
              variant="secondary"
              disabled={isPending(event.id)}
              onClick={() => void run(event.id, () => retry({ eventId: event.id }))}
            >
              Send again
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Is n8n doing its job: heartbeat, backlog, failed notifications and workflow errors. */
export function AdminAutomation() {
  const health = useQuery(api.admin.queries.automation, {});
  const now = useNow();
  if (health === undefined || now === null) {
    return <Skeleton className="h-32 w-full" />;
  }
  return (
    <section className="flex flex-col gap-6" aria-label="Automation">
      <div className="grid gap-3 sm:grid-cols-2">
        <OverdueWorkflowCard lastRunAt={health.overdueWorkflow.lastRunAt} now={now} />
        <Card>
          <h3 className="font-medium">Notifications waiting</h3>
          <p className="text-sm text-muted">
            {health.pendingEvents.count === 0
              ? 'Nothing waiting to be sent.'
              : `${String(health.pendingEvents.count)}${health.pendingEvents.isCapped ? '+' : ''} waiting for n8n (retried automatically).`}
          </p>
        </Card>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Failed notifications</h3>
        <FailedEvents events={health.failedEvents} now={now} />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Workflow errors reported by n8n</h3>
        {health.workflowErrors.length === 0 ? (
          <EmptyState>No workflow errors.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {health.workflowErrors.map((error) => (
              <li
                key={error.executionId}
                className="rounded-xl border border-border bg-surface px-4 py-3"
              >
                <span className="font-medium">{error.workflow}</span>
                {error.node === undefined ? '' : ` › ${error.node}`} · {error.message} ·{' '}
                {formatRelative(error.at, now)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
