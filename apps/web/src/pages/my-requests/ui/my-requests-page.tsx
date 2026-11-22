'use client';

import { useQuery } from 'convex/react';

import { api } from '@/shared/api';
import { useToday } from '@/shared/lib/today';
import { Page } from '@/shared/ui/page';
import { Header } from '@/widgets/header';
import { LoanList } from '@/widgets/loan-list';

export function MyRequestsPage() {
  const today = useToday();
  const loans = useQuery(api.loans.queries.mine, today === null ? 'skip' : { today });
  return (
    <>
      <Header />
      <Page title="My requests">
        <LoanList
          loans={loans}
          today={today}
          counterpartLabel="Owner"
          emptyText="You have not asked to borrow anything yet."
        />
      </Page>
    </>
  );
}
