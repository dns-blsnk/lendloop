'use client';

import { LoanAction } from '@lendloop/contracts';
import { useMutation } from 'convex/react';
import { useState } from 'react';

import { api } from '@/shared/api';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { ErrorText } from '@/shared/ui/error-text';

import type { Id } from '@/shared/api';
import type { ButtonVariant } from '@/shared/ui/button';
import type { PartyLoanAction } from '@lendloop/contracts';

const LOOK: Readonly<
  Record<PartyLoanAction, { label: string; variant: ButtonVariant; confirm?: string }>
> = {
  [LoanAction.APPROVE]: { label: 'Approve', variant: 'primary' },
  [LoanAction.DECLINE]: {
    label: 'Decline',
    variant: 'secondary',
    confirm: 'Decline this request?',
  },
  [LoanAction.CANCEL]: {
    label: 'Cancel loan',
    variant: 'danger',
    confirm: 'Cancel this loan? This cannot be undone.',
  },
  [LoanAction.MARK_RETURNED]: { label: 'Mark returned', variant: 'primary' },
};

/** The buttons the backend says this party may use now; the backend checks again on click. */
export function LoanActions({
  loanId,
  actions,
}: {
  loanId: Id<'loans'>;
  actions: readonly PartyLoanAction[];
}) {
  const act = useMutation(api.loans.mutations.act);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: PartyLoanAction) => {
    const { confirm } = LOOK[action];
    if (confirm !== undefined && !window.confirm(confirm)) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await act({ loanId, action });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  };

  if (actions.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            variant={LOOK[action].variant}
            disabled={pending}
            onClick={() => void run(action)}
          >
            {LOOK[action].label}
          </Button>
        ))}
      </div>
      <ErrorText message={error} />
    </div>
  );
}
