'use client';

import { useMutation, useQuery } from 'convex/react';

import { AvailabilityBadge, CategoryBadge, LenderName } from '@/entities/tool';
import { api } from '@/shared/api';
import { useToday } from '@/shared/lib/today';
import { Button } from '@/shared/ui/button';
import { ErrorText } from '@/shared/ui/error-text';
import { Skeleton } from '@/shared/ui/skeleton';

import { usePendingRow } from './use-pending';

/** Every listing, with a remove button that cancels its open requests and future loans. */
export function AdminListings() {
  const today = useToday();
  const result = useQuery(api.admin.queries.tools, today === null ? 'skip' : { today });
  const removeTool = useMutation(api.admin.mutations.removeTool);
  const { pendingId, error, run } = usePendingRow();

  if (result === undefined) {
    return <Skeleton className="h-32 w-full" />;
  }
  return (
    <section className="flex flex-col gap-3" aria-label="Listings">
      <ErrorText message={error} />
      <ul className="flex flex-col gap-2">
        {result.items.map((tool) => (
          <li
            key={tool.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{tool.name}</span>
              <CategoryBadge category={tool.category} />
              <AvailabilityBadge availability={tool.availability} />
              <LenderName lender={tool.lender} />
            </div>
            <Button
              variant="danger"
              disabled={pendingId === tool.id}
              onClick={() => {
                const question = `Remove "${tool.name}"? Its open requests and future loans are cancelled.`;
                if (window.confirm(question)) {
                  void run(tool.id, () => removeTool({ toolId: tool.id }));
                }
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      {result.isTruncated ? (
        <p className="text-sm text-muted">Showing the newest listings only.</p>
      ) : null}
    </section>
  );
}
