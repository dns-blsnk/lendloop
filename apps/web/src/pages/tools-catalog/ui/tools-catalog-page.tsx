import Link from 'next/link';
import { Suspense } from 'react';

import { buttonClass } from '@/shared/ui/button';
import { Page } from '@/shared/ui/page';
import { Skeleton } from '@/shared/ui/skeleton';
import { Header } from '@/widgets/header';

import { ToolCatalog } from './tool-catalog';

export function ToolsCatalogPage() {
  return (
    <>
      <Header />
      <Page
        title="Tools"
        actions={
          <Link href="/tools/new" className={buttonClass()}>
            List a tool
          </Link>
        }
      >
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <ToolCatalog />
        </Suspense>
      </Page>
    </>
  );
}
