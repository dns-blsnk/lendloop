'use client';

import { useMutation } from 'convex/react';
import { useState } from 'react';

import { api } from '@/shared/api';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { ErrorText } from '@/shared/ui/error-text';

import type { Id } from '@/shared/api';

/** Deletes the owner's listing after a confirmation; open requests on it are cancelled. */
export function DeleteToolButton({
  toolId,
  onDeletingChange,
  onDeleted,
}: {
  toolId: Id<'tools'>;
  /** Lets the page hold its "no longer listed" state while it navigates away after a delete. */
  onDeletingChange: (isDeleting: boolean) => void;
  onDeleted: () => void;
}) {
  const remove = useMutation(api.tools.mutations.remove);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (!window.confirm('Delete this listing? Open requests for it will be cancelled.')) {
      return;
    }
    onDeletingChange(true);
    try {
      await remove({ toolId });
      onDeleted();
    } catch (reason) {
      onDeletingChange(false);
      setError(errorMessage(reason));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="danger" onClick={() => void onClick()}>
        Delete listing
      </Button>
      <ErrorText message={error} />
    </div>
  );
}
