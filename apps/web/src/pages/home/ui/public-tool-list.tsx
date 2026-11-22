'use client';

import { api } from '@lendloop/backend/api';
import { useQuery } from 'convex/react';

import { useToday } from '@/shared/lib/today';
import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { CategoryBadge } from './category-badge';

const PLACEHOLDER_COUNT = 6;

/** Tools free to borrow today: name and category only, no owner details. */
export function PublicToolList() {
  const today = useToday();
  const tools = useQuery(api.tools.queries.listPublic, today === null ? 'skip' : { today });

  if (tools === undefined) {
    return (
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
        {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
          <li key={index}>
            <Card>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-20" />
            </Card>
          </li>
        ))}
      </ul>
    );
  }

  if (tools.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">
        Nothing to borrow right now. Be the first to list a tool.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <li key={tool.id}>
          <Card>
            <h3 className="font-medium">{tool.name}</h3>
            <div>
              <CategoryBadge category={tool.category} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
