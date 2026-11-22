import { z } from 'zod';

import { daysBetween, isoDateSchema } from './dates';

import type { IsoDate } from './dates';

export const LoanStatus = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
} as const;

export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

export const loanStatusSchema = z.enum(LoanStatus);

/**
 * Statuses that hold the tool for their dates. A new request may not overlap them, and approving a
 * request re-checks overlap and auto-declines the competing requests.
 */
export const BLOCKING_LOAN_STATUSES: readonly LoanStatus[] = [LoanStatus.APPROVED];

export const LoanAction = {
  APPROVE: 'approve',
  DECLINE: 'decline',
  CANCEL: 'cancel',
  MARK_RETURNED: 'markReturned',
  AUTO_DECLINE: 'autoDecline',
  WITHDRAW_FOR_REMOVED_TOOL: 'withdrawForRemovedTool',
} as const;

export type LoanAction = (typeof LoanAction)[keyof typeof LoanAction];

/** The two people on a loan. */
export const LoanParty = {
  OWNER: 'owner',
  BORROWER: 'borrower',
} as const;

export type LoanParty = (typeof LoanParty)[keyof typeof LoanParty];

/** Who may take an action: one of the parties, or the system on its own. */
export const LoanActor = { ...LoanParty, SYSTEM: 'system' } as const;

export type LoanActor = (typeof LoanActor)[keyof typeof LoanActor];

export interface LoanTransition {
  from: readonly LoanStatus[];
  to: LoanStatus;
  /** The only actor allowed to take this action. */
  by: LoanActor;
  /** The party that gets notified about the change. */
  notify: LoanParty;
  /** Allowed only before the loan's start date (checked on the server against its clock). */
  beforeStartOnly: boolean;
}

/**
 * Every allowed status change, who may make it and who hears about it. The backend enforces it;
 * the web app uses it to offer only actions that can succeed. Declined, cancelled and returned are
 * final.
 */
export const LOAN_TRANSITIONS: Readonly<Record<LoanAction, LoanTransition>> = {
  [LoanAction.APPROVE]: {
    from: [LoanStatus.REQUESTED],
    to: LoanStatus.APPROVED,
    by: LoanActor.OWNER,
    notify: LoanParty.BORROWER,
    // A request whose first day has passed is stale: approving it would create an instant overdue.
    beforeStartOnly: true,
  },
  [LoanAction.DECLINE]: {
    from: [LoanStatus.REQUESTED],
    to: LoanStatus.DECLINED,
    by: LoanActor.OWNER,
    notify: LoanParty.BORROWER,
    beforeStartOnly: false,
  },
  [LoanAction.CANCEL]: {
    // The borrower can back out until the loan starts, approved or not.
    from: [LoanStatus.REQUESTED, LoanStatus.APPROVED],
    to: LoanStatus.CANCELLED,
    by: LoanActor.BORROWER,
    notify: LoanParty.OWNER,
    beforeStartOnly: true,
  },
  [LoanAction.MARK_RETURNED]: {
    from: [LoanStatus.APPROVED],
    to: LoanStatus.RETURNED,
    by: LoanActor.OWNER,
    notify: LoanParty.BORROWER,
    beforeStartOnly: false,
  },
  [LoanAction.AUTO_DECLINE]: {
    // Another request for overlapping dates was approved.
    from: [LoanStatus.REQUESTED],
    to: LoanStatus.DECLINED,
    by: LoanActor.SYSTEM,
    notify: LoanParty.BORROWER,
    beforeStartOnly: false,
  },
  [LoanAction.WITHDRAW_FOR_REMOVED_TOOL]: {
    // The listing was deleted or removed by an admin; loans that have not started go with it.
    from: [LoanStatus.REQUESTED, LoanStatus.APPROVED],
    to: LoanStatus.CANCELLED,
    by: LoanActor.SYSTEM,
    notify: LoanParty.BORROWER,
    beforeStartOnly: true,
  },
};

/** Actions a party can take now; `today` hides the ones that need the loan not to have started. */
export function availableActions(
  loan: { status: LoanStatus; startDate: IsoDate },
  party: LoanParty,
  today: IsoDate,
): LoanAction[] {
  return Object.values(LoanAction).filter((action) => {
    const transition = LOAN_TRANSITIONS[action];
    return (
      transition.by === party &&
      transition.from.includes(loan.status) &&
      (!transition.beforeStartOnly || today < loan.startDate)
    );
  });
}

export const MAX_LOAN_DAYS = 30;

/** Date range of a borrow request. "Not in the past" is checked on the server against its clock. */
export const loanDatesSchema = z
  .object({ startDate: isoDateSchema, endDate: isoDateSchema })
  .superRefine(({ startDate, endDate }, ctx) => {
    const days = daysBetween(startDate, endDate);
    if (days < 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'The end date must be on or after the start date.',
        path: ['endDate'],
      });
    } else if (days >= MAX_LOAN_DAYS) {
      ctx.addIssue({
        code: 'custom',
        message: `A loan can last at most ${String(MAX_LOAN_DAYS)} days.`,
        path: ['endDate'],
      });
    }
  });

export type LoanDates = z.infer<typeof loanDatesSchema>;
