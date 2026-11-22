import type { ReactNode } from 'react';

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
      {children}
    </div>
  );
}
