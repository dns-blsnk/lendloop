import { APP_NAME } from '@lendloop/contracts';
import Link from 'next/link';

import { SignInCta } from '@/features/auth';

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        <SignInCta />
      </div>
    </header>
  );
}
