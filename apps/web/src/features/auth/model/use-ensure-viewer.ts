import { api } from '@lendloop/backend/api';
import { isAppErrorData } from '@lendloop/contracts';
import { useConvexAuth, useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useCallback, useEffect, useState } from 'react';

const FALLBACK_MESSAGE = 'We could not set up your account. Please try again.';

function messageOf(error: unknown): string {
  if (error instanceof ConvexError && isAppErrorData(error.data)) {
    return error.data.message;
  }
  return FALLBACK_MESSAGE;
}

/**
 * Creates or refreshes the Convex account right after Clerk signs the user in. The backend takes
 * name and email from the verified token only. A failure is kept so the UI can explain it and retry.
 */
export function useEnsureViewer(): { error: string | null; retry: () => void } {
  const { isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.users.mutations.ensure);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    ensure({}).then(
      () => {
        setError(null);
      },
      (reason: unknown) => {
        setError(messageOf(reason));
      },
    );
  }, [ensure]);

  useEffect(() => {
    if (isAuthenticated) {
      run();
    }
  }, [isAuthenticated, run]);

  return { error, retry: run };
}
