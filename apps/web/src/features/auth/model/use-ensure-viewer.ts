import { useConvexAuth, useMutation } from 'convex/react';
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/shared/api';
import { errorMessage } from '@/shared/lib/errors';

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
        setError(errorMessage(reason));
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
