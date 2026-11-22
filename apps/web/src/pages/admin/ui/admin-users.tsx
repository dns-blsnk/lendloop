'use client';

import { MAX_COUNTED_LISTINGS, Role } from '@lendloop/contracts';
import { useMutation, useQuery } from 'convex/react';

import { api } from '@/shared/api';
import { formatDateRange } from '@/shared/lib/dates';
import { useToday } from '@/shared/lib/today';
import { Button } from '@/shared/ui/button';
import { ErrorText } from '@/shared/ui/error-text';
import { Skeleton } from '@/shared/ui/skeleton';

import { usePendingRow } from './use-pending';

const ROLE_LABELS: Readonly<Record<Role, string>> = {
  [Role.ADMIN]: 'Admin',
  [Role.USER]: 'Neighbour',
};

/** The count is capped on the server; show that instead of a misleadingly exact number. */
function listingCount(count: number): string {
  return count >= MAX_COUNTED_LISTINGS ? `${String(MAX_COUNTED_LISTINGS)}+` : String(count);
}

export function AdminUsers() {
  const today = useToday();
  const result = useQuery(api.admin.queries.users, {});
  const setTrusted = useMutation(api.admin.mutations.setTrusted);
  const { pendingId, error, run } = usePendingRow();

  if (result === undefined || today === null) {
    return <Skeleton className="h-32 w-full" />;
  }
  return (
    <section className="flex flex-col gap-3" aria-label="Users">
      <ErrorText message={error} />
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Joined</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Listings</th>
              <th className="px-4 py-2 font-medium">Trusted Lender</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2">
                  {formatDateRange(user.joinedOn, user.joinedOn, today)}
                </td>
                <td className="px-4 py-2">{ROLE_LABELS[user.role]}</td>
                <td className="px-4 py-2">{listingCount(user.activeListings)}</td>
                <td className="px-4 py-2">
                  <Button
                    variant={user.isTrustedLender ? 'secondary' : 'primary'}
                    disabled={pendingId === user.id}
                    onClick={() =>
                      void run(user.id, () =>
                        setTrusted({ userId: user.id, isTrustedLender: !user.isTrustedLender }),
                      )
                    }
                  >
                    {user.isTrustedLender ? 'Remove badge' : 'Mark trusted'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.isTruncated ? (
        <p className="text-sm text-muted">Showing the newest users only.</p>
      ) : null}
    </section>
  );
}
