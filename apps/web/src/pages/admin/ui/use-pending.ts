'use client';

import { useState } from 'react';

import { errorMessage } from '@/shared/lib/errors';

/**
 * Tracks admin mutations per row: a row's button stays disabled until its own request answers,
 * even while other rows are busy, so a double click cannot send the same request twice.
 */
export function usePendingRow() {
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const update = (rowId: string, isPending: boolean) => {
    setPending((current) => {
      const next = new Set(current);
      if (isPending) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  };

  const run = async (rowId: string, task: () => Promise<unknown>) => {
    update(rowId, true);
    setError(null);
    try {
      await task();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      update(rowId, false);
    }
  };

  return { isPending: (rowId: string) => pending.has(rowId), error, run };
}
