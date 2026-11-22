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

/** When, relative to the loan's first day, an action is allowed (by the server's clock). */
export const LoanTiming = {
  ANY_TIME: 'anyTime',
  /** Up to and including the first day: before the tool changes hands. */
  UNTIL_START: 'untilStart',
  /** From the first day on: the tool can only come back once it has gone out. */
  FROM_START: 'fromStart',
} as const;

export type LoanTiming = (typeof LoanTiming)[keyof typeof LoanTiming];

export interface LoanTransition {
  from: readonly LoanStatus[];
  to: LoanStatus;
  /** The only actor allowed to take this action. */
  by: LoanActor;
  /** The party that gets notified about the change. */
  notify: LoanParty;
  timing: LoanTiming;
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
    // Approving after the first day would create a loan that is already under way or overdue.
    timing: LoanTiming.UNTIL_START,
  },
  [LoanAction.DECLINE]: {
    from: [LoanStatus.REQUESTED],
    to: LoanStatus.DECLINED,
    by: LoanActor.OWNER,
    notify: LoanParty.BORROWER,
    timing: LoanTiming.ANY_TIME,
  },
  [LoanAction.CANCEL]: {
    // The borrower can back out until the loan starts, approved or not.
    from: [LoanStatus.REQUESTED, LoanStatus.APPROVED],
    to: LoanStatus.CANCELLED,
    by: LoanActor.BORROWER,
    notify: LoanParty.OWNER,
    timing: LoanTiming.UNTIL_START,
  },
  [LoanAction.MARK_RETURNED]: {
    from: [LoanStatus.APPROVED],
    to: LoanStatus.RETURNED,
    by: LoanActor.OWNER,
    notify: LoanParty.BORROWER,
    timing: LoanTiming.FROM_START,
  },
  [LoanAction.AUTO_DECLINE]: {
    // Another request for overlapping dates was approved, or nobody answered before the first day.
    from: [LoanStatus.REQUESTED],
    to: LoanStatus.DECLINED,
    by: LoanActor.SYSTEM,
    notify: LoanParty.BORROWER,
    timing: LoanTiming.ANY_TIME,
  },
  [LoanAction.WITHDRAW_FOR_REMOVED_TOOL]: {
    // The listing was deleted or removed by an admin. Removal is refused while an approved loan is
    // under way, so every approved loan this reaches has not started yet.
    from: [LoanStatus.REQUESTED, LoanStatus.APPROVED],
    to: LoanStatus.CANCELLED,
    by: LoanActor.SYSTEM,
    notify: LoanParty.BORROWER,
    timing: LoanTiming.ANY_TIME,
  },
};

function timingAllows(timing: LoanTiming, startDate: IsoDate, today: IsoDate): boolean {
  switch (timing) {
    case LoanTiming.ANY_TIME:
      return true;
    case LoanTiming.UNTIL_START:
      return today <= startDate;
    case LoanTiming.FROM_START:
      return today >= startDate;
  }
}

/** Why an action cannot be applied to a loan now (status or timing), or null if it can. */
export function transitionProblem(
  loan: { status: LoanStatus; startDate: IsoDate },
  action: LoanAction,
  today: IsoDate,
): string | null {
  const transition = LOAN_TRANSITIONS[action];
  if (!transition.from.includes(loan.status)) {
    return `A ${loan.status} loan cannot be changed this way.`;
  }
  if (!timingAllows(transition.timing, loan.startDate, today)) {
    return 'This is not possible on this date any more.';
  }
  return null;
}

/** Actions a party can take now. */
export function availableActions(
  loan: { status: LoanStatus; startDate: IsoDate },
  party: LoanParty,
  today: IsoDate,
): LoanAction[] {
  return Object.values(LoanAction).filter(
    (action) =>
      LOAN_TRANSITIONS[action].by === party && transitionProblem(loan, action, today) === null,
  );
}

export const MAX_LOAN_DAYS = 30;

const loanDateFieldsSchema = z.object({ startDate: isoDateSchema, endDate: isoDateSchema });

/** Range rules for a borrow request. "Not in the past" is checked on the server against its clock. */
function checkLoanDates(
  { startDate, endDate }: { startDate: IsoDate; endDate: IsoDate },
  ctx: z.RefinementCtx,
): void {
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
}

export const loanDatesSchema = loanDateFieldsSchema.superRefine(checkLoanDates);

/** A borrow request for one tool; the caller supplies the id schema (the backend's `zid`). */
export function loanRequestSchema<IdSchema extends z.ZodType<string>>(toolId: IdSchema) {
  return loanDateFieldsSchema.extend({ toolId }).superRefine(checkLoanDates);
}

export type LoanDates = z.infer<typeof loanDatesSchema>;

/** Actions a person can request through the API; system actions never come from a client. */
export const PARTY_LOAN_ACTIONS = [
  LoanAction.APPROVE,
  LoanAction.DECLINE,
  LoanAction.CANCEL,
  LoanAction.MARK_RETURNED,
] as const;

export const partyLoanActionSchema = z.enum(PARTY_LOAN_ACTIONS);

export type PartyLoanAction = z.infer<typeof partyLoanActionSchema>;

/**
 * Open requests one borrower may have at a time; keeps a single account from flooding owners.
 * Requests whose first day has passed expire daily and stop counting.
 */
export const MAX_OPEN_REQUESTS_PER_BORROWER = 10;

/** Finished loans (declined, cancelled, returned) one list shows; open ones are always shown. */
export const MAX_FINISHED_LOANS_PER_LIST = 50;

/**
 * A loan as one of its parties sees it. `counterpart` is the other person: the borrower for the
 * owner, the owner for the borrower. Names only, never emails. The backend adds the ids.
 */
export const loanViewSchema = z.object({
  status: loanStatusSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  isOverdue: z.boolean(),
  toolName: z.string(),
  /** False once the tool was deleted or removed, so the UI stops linking to it. */
  isToolListed: z.boolean(),
  counterpart: z.object({ name: z.string(), isTrustedLender: z.boolean() }),
  actions: z.array(partyLoanActionSchema),
});

export type LoanView = z.infer<typeof loanViewSchema>;

export function isPartyLoanAction(action: LoanAction): action is PartyLoanAction {
  return (PARTY_LOAN_ACTIONS as readonly LoanAction[]).includes(action);
}
