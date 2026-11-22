'use client';

import { useEnsureViewer } from '../model/use-ensure-viewer';

/** Keeps the Convex account in sync with the Clerk session; shows a notice only if that fails. */
export function EnsureViewer() {
  const { error, retry } = useEnsureViewer();
  if (error === null) {
    return null;
  }
  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-3 bg-amber-100 px-4 py-2 text-sm text-amber-900"
    >
      <span>{error}</span>
      <button type="button" onClick={retry} className="font-medium underline">
        Try again
      </button>
    </div>
  );
}
