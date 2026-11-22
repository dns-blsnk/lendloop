'use client';

import Link from 'next/link';

import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';

/** Shown when a page fails, e.g. a tool that was removed or a loan that is not yours. */
export function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">This page could not be shown</h1>
      <p className="text-muted">{errorMessage(error)}</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/tools" className="px-4 py-2 text-sm font-medium text-accent hover:underline">
          Back to tools
        </Link>
      </div>
    </main>
  );
}
