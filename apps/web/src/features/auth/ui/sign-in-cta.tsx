'use client';

import { SignInButton, useAuth, UserButton } from '@clerk/nextjs';

/** Follows the Clerk session, so a signed-in user can always reach the account menu to sign out. */
export function SignInCta() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <span className="block h-10 w-48 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
    );
  }
  if (isSignedIn) {
    return <UserButton />;
  }
  return (
    <SignInButton mode="modal">
      <button
        type="button"
        className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Sign in to lend or borrow
      </button>
    </SignInButton>
  );
}
