import { Suspense } from 'react';

import { Page } from '@/shared/ui/page';
import { Skeleton } from '@/shared/ui/skeleton';
import { Header } from '@/widgets/header';

import { ToolEditForm } from './tool-edit-form';

export function ToolEditPage() {
  return (
    <>
      <Header />
      <Page title="Edit listing">
        <Suspense fallback={<Skeleton className="h-64 w-full max-w-xl" />}>
          <ToolEditForm />
        </Suspense>
      </Page>
    </>
  );
}
