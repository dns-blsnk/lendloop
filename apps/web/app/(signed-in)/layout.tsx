import { SignedInOnly } from '@/features/auth';

import type { ReactNode } from 'react';

export default function SignedInLayout({ children }: { children: ReactNode }) {
  return <SignedInOnly>{children}</SignedInOnly>;
}
