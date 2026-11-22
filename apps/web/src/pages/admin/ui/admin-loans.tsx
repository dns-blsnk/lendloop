'use client';

import { LoanStatus, loanStatusSchema } from '@lendloop/contracts';
import { useQuery } from 'convex/react';
import { useState } from 'react';

import { LOAN_STATUS_LABELS, LoanStatusBadge } from '@/entities/loan';
import { api } from '@/shared/api';
import { formatDateRange } from '@/shared/lib/dates';
import { useToday } from '@/shared/lib/today';
import { EmptyState } from '@/shared/ui/empty-state';
import { CONTROL_CLASS } from '@/shared/ui/field';
import { Skeleton } from '@/shared/ui/skeleton';

import type { IsoDate } from '@lendloop/contracts';
import type { FunctionReturnType } from 'convex/server';

const ALL = '';

type AdminLoanRow = FunctionReturnType<typeof api.admin.queries.loans>['items'][number];

export function AdminLoans() {
  const today = useToday();
  const [status, setStatus] = useState<LoanStatus | undefined>(undefined);
  const result = useQuery(
    api.admin.queries.loans,
    today === null ? 'skip' : { today, ...(status === undefined ? {} : { status }) },
  );

  return (
    <section className="flex flex-col gap-4" aria-label="All loans">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">Status</span>
        <select
          className={`${CONTROL_CLASS} w-auto`}
          value={status ?? ALL}
          onChange={(event) => {
            const parsed = loanStatusSchema.safeParse(event.target.value);
            setStatus(parsed.success ? parsed.data : undefined);
          }}
        >
          <option value={ALL}>All statuses</option>
          {Object.values(LoanStatus).map((value) => (
            <option key={value} value={value}>
              {LOAN_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      {result === undefined || today === null ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <LoansTable loans={result.items} isTruncated={result.isTruncated} today={today} />
      )}
    </section>
  );
}

function LoansTable({
  loans,
  isTruncated,
  today,
}: {
  loans: AdminLoanRow[];
  isTruncated: boolean;
  today: IsoDate;
}) {
  if (loans.length === 0) {
    return <EmptyState>No loans match this filter.</EmptyState>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Tool</th>
            <th className="px-4 py-2 font-medium">Owner</th>
            <th className="px-4 py-2 font-medium">Borrower</th>
            <th className="px-4 py-2 font-medium">Dates</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2">{loan.toolName}</td>
              <td className="px-4 py-2">{loan.ownerName}</td>
              <td className="px-4 py-2">{loan.borrowerName}</td>
              <td className="px-4 py-2 whitespace-nowrap">
                {formatDateRange(loan.startDate, loan.endDate, today)}
              </td>
              <td className="px-4 py-2">
                <LoanStatusBadge status={loan.status} isOverdue={loan.isOverdue} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isTruncated ? (
        <p className="px-4 py-2 text-sm text-muted">
          Showing the newest loans only; filter by status to see more.
        </p>
      ) : null}
    </div>
  );
}
