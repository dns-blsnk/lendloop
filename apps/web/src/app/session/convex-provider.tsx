'use client';

import { useAuth } from '@clerk/nextjs';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';

import { publicEnv } from '@/shared/config';

import type { ReactNode } from 'react';

const convex = new ConvexReactClient(publicEnv.NEXT_PUBLIC_CONVEX_URL);

/** Sends the Clerk session token (template "convex") with every Convex call. */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
