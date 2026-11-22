'use client';

import { useMutation } from 'convex/react';
import { useState } from 'react';

import { api } from '@/shared/api';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';

import type { Id } from '@/shared/api';

/** Deletes the owner's listing after a confirmation; open requests on it are cancelled. */
export function DeleteToolButton({
  toolId,
  onDeleted,
}: {
  toolId: Id<'tools'>;
  onDeleted: () => void;
}) {
  const remove = useMutation(api.tools.mutations.remove);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (!window.confirm('Delete this listing? Open requests for it will be cancelled.')) {
      return;
    }
    try {
      await remove({ toolId });
      onDeleted();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="danger" onClick={() => void onClick()}>
        Delete listing
      </Button>
      {error === null ? null : (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
