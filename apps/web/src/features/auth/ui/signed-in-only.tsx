'use client';

import { SignInButton, useAuth } from '@clerk/nextjs';
import { useConvexAuth } from 'convex/react';

import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

import { useViewer } from '../model/use-viewer';

import type { ReactNode } from 'react';

function SignInPrompt() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in to continue</h1>
      <p className="text-muted">Lending and borrowing are for signed-in neighbours.</p>
      <SignInButton mode="modal">
        <Button>Sign in to lend or borrow</Button>
      </SignInButton>
    </main>
  );
}

/**
 * Shows its children once the user is signed in and their Convex account exists, so pages never
 * query before the account is ready; guests get a sign-in prompt. A courtesy for the UI: every
 * Convex function checks the caller on its own.
 */
export function SignedInOnly({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const viewer = useViewer();
  if (isLoaded && !isSignedIn) {
    return <SignInPrompt />;
  }
  if (!isAuthenticated || viewer === undefined || viewer === null) {
    return <Skeleton className="mx-auto mt-16 h-24 w-full max-w-xl" />;
  }
  return children;
}
