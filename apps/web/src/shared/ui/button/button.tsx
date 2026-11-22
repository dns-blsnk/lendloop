import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary: 'bg-accent text-accent-foreground hover:opacity-90',
  secondary: 'border border-border bg-surface hover:bg-background',
  danger:
    'border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950',
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

/** Button look for links that act like buttons (e.g. "List a tool"). */
export function buttonClass(variant: ButtonVariant = 'primary'): string {
  return `inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]}`;
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    // The default is "button"; forms pass type="submit" explicitly.

    <button type={type} className={`${buttonClass(variant)} ${className}`} {...props} />
  );
}
