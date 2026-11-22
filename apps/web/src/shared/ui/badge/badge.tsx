import type { ReactNode } from 'react';

const TONES = {
  neutral: 'border-border bg-background text-muted',
  accent: 'border-transparent bg-accent-soft text-accent',
  warning: 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  danger: 'border-transparent bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
