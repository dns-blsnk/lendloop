'use client';

import { useQuery } from 'convex/react';

import { ToolGrid } from '@/entities/tool';
import { api } from '@/shared/api';
import { useToday } from '@/shared/lib/today';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';

import { CategoryFilter, useCategoryFilter } from './category-filter';

import type { ToolCategory } from '@lendloop/contracts';

function useTools(category: ToolCategory | undefined) {
  const today = useToday();
  return useQuery(
    api.tools.queries.list,
    today === null ? 'skip' : { today, ...(category === undefined ? {} : { category }) },
  );
}

function CatalogBody({ tools }: { tools: ReturnType<typeof useTools> }) {
  if (tools === undefined) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (tools.length === 0) {
    return <EmptyState>No tools in this category yet.</EmptyState>;
  }
  return <ToolGrid tools={tools} />;
}

/** Every listed tool with its availability, filterable by category through the URL. */
export function ToolCatalog() {
  const category = useCategoryFilter();
  const tools = useTools(category);
  return (
    <div className="flex flex-col gap-4">
      <CategoryFilter category={category} />
      <CatalogBody tools={tools} />
    </div>
  );
}
