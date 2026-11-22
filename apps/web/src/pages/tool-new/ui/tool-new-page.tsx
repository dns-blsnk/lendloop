'use client';

import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';

import { ToolForm } from '@/features/tool-form';
import { api } from '@/shared/api';
import { Page } from '@/shared/ui/page';
import { Header } from '@/widgets/header';

export function ToolNewPage() {
  const create = useMutation(api.tools.mutations.create);
  const router = useRouter();
  return (
    <>
      <Header />
      <Page title="List a tool">
        <ToolForm
          submitLabel="List tool"
          onSubmit={async (fields) => {
            const toolId = await create(fields);
            router.push(`/tools/${toolId}`);
          }}
        />
      </Page>
    </>
  );
}
