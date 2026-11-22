'use client';

import { useState } from 'react';

import { errorMessage } from '@/shared/lib/errors';

/**
 * Runs one admin mutation at a time per row: the row's button stays disabled until the server
 * answers, so a double click cannot send the request twice.
 */
export function usePendingRow() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (rowId: string, task: () => Promise<unknown>) => {
    setPendingId(rowId);
    setError(null);
    try {
      await task();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPendingId(null);
    }
  };

  return { pendingId, error, run };
}
