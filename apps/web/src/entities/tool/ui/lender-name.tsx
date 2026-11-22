import type { Lender } from '@lendloop/contracts';

/** A neighbour's name with the Trusted Lender badge an admin may have given them. */
export function LenderName({ lender }: { lender: Lender }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      {lender.name}
      {lender.isTrustedLender ? (
        <span
          className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent"
          title="An admin vouches for this lender"
        >
          ✓ Trusted Lender
        </span>
      ) : null}
    </span>
  );
}
