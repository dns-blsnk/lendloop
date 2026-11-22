'use client';

import { SignInButton, useAuth, UserButton } from '@clerk/nextjs';

import { Button } from '@/shared/ui/button';
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
      <Button className="rounded-full">Sign in to lend or borrow</Button>
    </SignInButton>
  );
}
