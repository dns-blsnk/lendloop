'use client';

import { SignInButton, useAuth, UserButton } from '@clerk/nextjs';

import { Skeleton } from '@/shared/ui/skeleton';

/** Follows the Clerk session, so a signed-in user can always reach the account menu to sign out. */
export function SignInCta() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return <Skeleton className="h-9 w-44 rounded-full" />;
  }
  if (isSignedIn) {
    return <UserButton />;
  }
  return (
    <SignInButton mode="modal">
      <button
        type="button"
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        Sign in to lend or borrow
      </button>
    </SignInButton>
  );
}
