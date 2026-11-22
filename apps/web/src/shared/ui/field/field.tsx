import type { ReactNode } from 'react';

export const CONTROL_CLASS =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent';

/** A labelled form control with its validation message. */
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error === undefined ? null : (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
