'use client';

import Link from 'next/link';

import { LoanStatusBadge } from '@/entities/loan';
import { LenderName } from '@/entities/tool';
import { formatDateRange } from '@/shared/lib/dates';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';

import { LoanActions } from './loan-actions';

import type { api } from '@/shared/api';
import type { IsoDate } from '@lendloop/contracts';
import type { FunctionReturnType } from 'convex/server';

type LoanRow = FunctionReturnType<typeof api.loans.queries.mine>[number];

function LoanItem({
  loan,
  counterpartLabel,
  today,
}: {
  loan: LoanRow;
  counterpartLabel: string;
  today: IsoDate;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {loan.isToolListed ? (
              <Link href={`/tools/${loan.toolId}`} className="font-medium hover:underline">
                {loan.toolName}
              </Link>
            ) : (
              <span className="font-medium text-muted">{loan.toolName}</span>
            )}
            <LoanStatusBadge status={loan.status} isOverdue={loan.isOverdue} />
          </div>
          <span className="text-sm text-muted">
            {formatDateRange(loan.startDate, loan.endDate, today)}
          </span>
          <span className="flex items-center gap-1 text-sm text-muted">
            {counterpartLabel}: <LenderName lender={loan.counterpart} />
          </span>
        </div>
        <LoanActions loanId={loan.id} actions={loan.actions} />
      </div>
    </Card>
  );
}

/** Loans seen from one side; only the other person's name is ever shown. */
export function LoanList({
  loans,
  today,
  counterpartLabel,
  emptyText,
}: {
  loans: readonly LoanRow[] | undefined;
  today: IsoDate | null;
  counterpartLabel: string;
  emptyText: string;
}) {
  if (loans === undefined || today === null) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (loans.length === 0) {
    return <EmptyState>{emptyText}</EmptyState>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {loans.map((loan) => (
        <li key={loan.id}>
          <LoanItem loan={loan} counterpartLabel={counterpartLabel} today={today} />
        </li>
      ))}
    </ul>
  );
}
