'use client';

import { can } from '@lendloop/contracts';
import { useQuery } from 'convex/react';

import { api } from '@/shared/api';

import type { Permission, Viewer } from '@lendloop/contracts';

/** The signed-in user's account (undefined while loading, null for guests). */
export function useViewer(): Viewer | null | undefined {
  return useQuery(api.users.queries.me, {});
}

/** Whether to show a control; the backend enforces the same rule on its own. */
export function useCan(permission: Permission): boolean {
  const viewer = useViewer();
  return viewer !== undefined && viewer !== null && can(viewer.role, permission);
}
