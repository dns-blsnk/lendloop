'use client';

import { can, Permission } from '@lendloop/contracts';
import { useState } from 'react';

import { useViewer } from '@/features/auth';
import { Page } from '@/shared/ui/page';
import { Skeleton } from '@/shared/ui/skeleton';
import { Header } from '@/widgets/header';

import { AdminAutomation } from './admin-automation';
import { AdminListings } from './admin-listings';
import { AdminLoans } from './admin-loans';
import { AdminTabs } from './admin-tabs';
import { AdminUsers } from './admin-users';

/** Each tab needs its own permission; the server checks the same matrix on every call. */
const SECTIONS = [
  { id: 'loans', label: 'Loans', permission: Permission.LOANS_LIST_ALL, Panel: AdminLoans },
  { id: 'users', label: 'Users', permission: Permission.USERS_MARK_TRUSTED, Panel: AdminUsers },
  {
    id: 'listings',
    label: 'Listings',
    permission: Permission.TOOLS_REMOVE_ANY,
    Panel: AdminListings,
  },
  {
    id: 'automation',
    label: 'Automation',
    permission: Permission.AUTOMATION_VIEW_HEALTH,
    Panel: AdminAutomation,
  },
] as const;

function AdminSections({ sections }: { sections: readonly (typeof SECTIONS)[number][] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const active = sections.find((section) => section.id === activeId) ?? sections[0];
  if (active === undefined) {
    return <p className="text-muted">This page is for admins.</p>;
  }
  return (
    <>
      <AdminTabs tabs={sections} active={active.id} onSelect={setActiveId} />
      <div role="tabpanel" id={`panel-${active.id}`} aria-labelledby={`tab-${active.id}`}>
        <active.Panel />
      </div>
    </>
  );
}

export function AdminPage() {
  const viewer = useViewer();
  return (
    <>
      <Header />
      <Page title="Admin">
        {viewer === undefined ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <AdminSections
            sections={SECTIONS.filter(
              (section) => viewer !== null && can(viewer.role, section.permission),
            )}
          />
        )}
      </Page>
    </>
  );
}
