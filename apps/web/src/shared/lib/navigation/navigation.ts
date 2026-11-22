'use client';

import { useParams, usePathname, useSearchParams } from 'next/navigation';

// The empty root `pages/` folder (needed for FSD) makes Next type these hooks as nullable for
// Pages Router compatibility. Every route here is in the App Router, where they are never null.

export function useRouteParam(name: string): string {
  const value = useParams<Record<string, string>>()?.[name];
  if (value === undefined) {
    throw new Error(`Missing route parameter "${name}"`);
  }
  return value;
}

export function useSearchParam(name: string): string | null {
  return useSearchParams()?.get(name) ?? null;
}

export function useCurrentPath(): string {
  return usePathname() ?? '/';
}
