'use client';

import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';

import { ToolForm } from '@/features/tool-form';
import { api, asId } from '@/shared/api';
import { useRouteParam } from '@/shared/lib/navigation';
import { useToday } from '@/shared/lib/today';
import { Skeleton } from '@/shared/ui/skeleton';

export function ToolEditForm() {
  const toolId = asId<'tools'>(useRouteParam('id'));
  const today = useToday();
  const router = useRouter();
  const update = useMutation(api.tools.mutations.update);
  const tool = useQuery(api.tools.queries.get, today === null ? 'skip' : { today, toolId });

  if (tool === undefined) {
    return <Skeleton className="h-64 w-full max-w-xl" />;
  }
  if (tool === null) {
    return <p className="text-muted">This tool is no longer listed.</p>;
  }
  if (!tool.isMine) {
    return <p className="text-muted">Only the owner can edit this listing.</p>;
  }
  return (
    <ToolForm
      initial={tool}
      submitLabel="Save changes"
      onSubmit={async (fields) => {
        await update({ toolId, ...fields });
        router.push(`/tools/${toolId}`);
      }}
    />
  );
}
