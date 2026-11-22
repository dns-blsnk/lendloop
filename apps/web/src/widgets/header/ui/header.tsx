'use client';

import { useAuth } from '@clerk/nextjs';
import { APP_NAME, Permission } from '@lendloop/contracts';
import Link from 'next/link';

import { SignInCta, useCan } from '@/features/auth';
import { useCurrentPath } from '@/shared/lib/navigation';

const LINKS = [
  { href: '/tools', label: 'Tools' },
  { href: '/me/listings', label: 'My listings' },
  { href: '/me/requests', label: 'My requests' },
  { href: '/me/incoming', label: 'Incoming' },
] as const;

/** Active on the link's own page and anything below it, not on paths that merely share a prefix. */
function isUnder(path: string, href: string): boolean {
  return path === href || path.startsWith(`${href}/`);
}

function NavLink({ href, label, path }: { href: string; label: string; path: string }) {
  const isActive = isUnder(path, href);
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`rounded-md px-2 py-1 text-sm ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:text-foreground'}`}
    >
      {label}
    </Link>
  );
}

export function Header() {
  const { isSignedIn } = useAuth();
  const isAdmin = useCan(Permission.LOANS_LIST_ALL);
  const path = useCurrentPath();
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <Link href="/" className="font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        {isSignedIn === true ? (
          <nav aria-label="Main" className="flex flex-wrap gap-1">
            {LINKS.map((link) => (
              <NavLink key={link.href} {...link} path={path} />
            ))}
            {isAdmin ? <NavLink href="/admin" label="Admin" path={path} /> : null}
          </nav>
        ) : null}
        <SignInCta />
      </div>
    </header>
  );
}
