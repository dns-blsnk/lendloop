'use client';

import { useQuery } from 'convex/react';
import Link from 'next/link';

import { ToolGrid } from '@/entities/tool';
import { api } from '@/shared/api';
import { useToday } from '@/shared/lib/today';
import { buttonClass } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Page } from '@/shared/ui/page';
import { Skeleton } from '@/shared/ui/skeleton';
import { Header } from '@/widgets/header';

function Listings() {
  const today = useToday();
  const tools = useQuery(api.tools.queries.mine, today === null ? 'skip' : { today });
  if (tools === undefined) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (tools.length === 0) {
    return <EmptyState>You have not listed any tools yet.</EmptyState>;
  }
  return <ToolGrid tools={tools} />;
}

export function MyListingsPage() {
  return (
    <>
      <Header />
      <Page
        title="My listings"
        actions={
          <Link href="/tools/new" className={buttonClass()}>
            List a tool
          </Link>
        }
      >
        <Listings />
      </Page>
    </>
  );
}
