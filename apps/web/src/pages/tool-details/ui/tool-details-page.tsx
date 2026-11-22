import { Suspense } from 'react';

import { Skeleton } from '@/shared/ui/skeleton';
import { Header } from '@/widgets/header';

import { ToolDetails } from './tool-details';

export function ToolDetailsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <ToolDetails />
        </Suspense>
      </main>
    </>
  );
}
