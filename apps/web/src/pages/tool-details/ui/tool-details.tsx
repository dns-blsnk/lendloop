'use client';

import { TOOL_CONDITION_LABELS } from '@lendloop/contracts';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AvailabilityBadge, CategoryBadge, LenderName } from '@/entities/tool';
import { api, asId } from '@/shared/api';
import { useRouteParam } from '@/shared/lib/navigation';
import { useToday } from '@/shared/lib/today';
import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { DeleteToolButton } from './delete-tool-button';
import { RequestLoanForm } from './request-loan-form';

function NoLongerListed() {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-muted">This tool is no longer listed.</p>
      <Link href="/tools" className="text-sm font-medium text-accent hover:underline">
        Back to tools
      </Link>
    </div>
  );
}

export function ToolDetails() {
  const toolId = asId<'tools'>(useRouteParam('id'));
  const today = useToday();
  const router = useRouter();
  const [isDeleting, setDeleting] = useState(false);
  const tool = useQuery(api.tools.queries.get, today === null ? 'skip' : { today, toolId });

  if (tool === undefined || today === null || (tool === null && isDeleting)) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (tool === null) {
    return <NoLongerListed />;
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{tool.name}</h1>
          <AvailabilityBadge availability={tool.availability} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={tool.category} />
          <span className="text-sm text-muted">{TOOL_CONDITION_LABELS[tool.condition]}</span>
        </div>
        <p className="whitespace-pre-line">
          {tool.description === '' ? 'No description.' : tool.description}
        </p>
        {tool.isMine ? null : <LenderName lender={tool.lender} />}
      </Card>
      <Card>
        {tool.isMine ? (
          <>
            <h2 className="font-semibold">Your listing</h2>
            <Link
              href={`/tools/${toolId}/edit`}
              className="text-sm font-medium text-accent hover:underline"
            >
              Edit details
            </Link>
            <DeleteToolButton
              onDeletingChange={setDeleting}
              toolId={toolId}
              onDeleted={() => {
                router.push('/me/listings');
              }}
            />
          </>
        ) : (
          <>
            <h2 className="font-semibold">Borrow it</h2>
            <RequestLoanForm toolId={toolId} today={today} />
          </>
        )}
      </Card>
    </div>
  );
}
