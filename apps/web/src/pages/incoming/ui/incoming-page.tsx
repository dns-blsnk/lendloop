'use client';

import { useQuery } from 'convex/react';

import { api } from '@/shared/api';
import { useToday } from '@/shared/lib/today';
import { Page } from '@/shared/ui/page';
import { Header } from '@/widgets/header';
import { LoanList } from '@/widgets/loan-list';

export function IncomingPage() {
  const today = useToday();
  const loans = useQuery(api.loans.queries.incoming, today === null ? 'skip' : { today });
  return (
    <>
      <Header />
      <Page title="Incoming requests">
        <LoanList
          loans={loans}
          today={today}
          counterpartLabel="Borrower"
          emptyText="Nobody has asked to borrow your tools yet."
        />
      </Page>
    </>
  );
}
