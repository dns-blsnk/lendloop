import { describe, expect, it } from 'vitest';

import {
  availableActions,
  LOAN_TRANSITIONS,
  LoanAction,
  LoanActor,
  LoanParty,
  loanDatesSchema,
  LoanStatus,
  MAX_LOAN_DAYS,
} from './loans';

const TODAY = '2026-12-01';
const future = (status: LoanStatus) => ({ status, startDate: '2026-12-05' });
const started = (status: LoanStatus) => ({ status, startDate: TODAY });

describe('availableActions', () => {
  it('lets the owner approve or decline a request and the borrower cancel it', () => {
    expect(availableActions(future(LoanStatus.REQUESTED), LoanParty.OWNER, TODAY)).toEqual([
      LoanAction.APPROVE,
      LoanAction.DECLINE,
    ]);
    expect(availableActions(future(LoanStatus.REQUESTED), LoanParty.BORROWER, TODAY)).toEqual([
      LoanAction.CANCEL,
    ]);
  });

  it('still offers approval on the first day and stops after it', () => {
    expect(availableActions(started(LoanStatus.REQUESTED), LoanParty.OWNER, TODAY)).toEqual([
      LoanAction.APPROVE,
      LoanAction.DECLINE,
    ]);
    const stale = { status: LoanStatus.REQUESTED, startDate: '2026-11-30' };
    expect(availableActions(stale, LoanParty.OWNER, TODAY)).toEqual([LoanAction.DECLINE]);
  });

  it('offers return only once the loan has started', () => {
    expect(availableActions(future(LoanStatus.APPROVED), LoanParty.OWNER, TODAY)).toEqual([]);
  });

  it('lets the borrower cancel an approved loan only before its first day', () => {
    expect(availableActions(future(LoanStatus.APPROVED), LoanParty.BORROWER, TODAY)).toEqual([
      LoanAction.CANCEL,
    ]);
    expect(availableActions(started(LoanStatus.APPROVED), LoanParty.BORROWER, TODAY)).toEqual([]);
  });

  it('lets the borrower withdraw a request on its first day', () => {
    expect(availableActions(started(LoanStatus.REQUESTED), LoanParty.BORROWER, TODAY)).toEqual([
      LoanAction.CANCEL,
    ]);
  });

  it('lets only the owner mark an approved loan as returned', () => {
    expect(availableActions(started(LoanStatus.APPROVED), LoanParty.OWNER, TODAY)).toEqual([
      LoanAction.MARK_RETURNED,
    ]);
  });

  it('has no way out of a final status', () => {
    for (const status of [LoanStatus.DECLINED, LoanStatus.CANCELLED, LoanStatus.RETURNED]) {
      for (const party of Object.values(LoanParty)) {
        expect(availableActions(future(status), party, TODAY)).toEqual([]);
      }
    }
  });

  it('never offers system actions to a person', () => {
    for (const party of Object.values(LoanParty)) {
      const actions = availableActions(future(LoanStatus.REQUESTED), party, TODAY);
      expect(actions).not.toContain(LoanAction.AUTO_DECLINE);
      expect(actions).not.toContain(LoanAction.WITHDRAW_FOR_REMOVED_TOOL);
    }
  });
});

describe('LOAN_TRANSITIONS', () => {
  it('notifies the other party when a person acts', () => {
    for (const transition of Object.values(LOAN_TRANSITIONS)) {
      if (transition.by !== LoanActor.SYSTEM) {
        expect(transition.notify).not.toBe(transition.by);
      }
    }
  });

  it('tells the borrower about every change the system makes', () => {
    for (const transition of Object.values(LOAN_TRANSITIONS)) {
      if (transition.by === LoanActor.SYSTEM) {
        expect(transition.notify).toBe(LoanParty.BORROWER);
      }
    }
  });
});

describe('loanDatesSchema', () => {
  const parse = (startDate: string, endDate: string) =>
    loanDatesSchema.safeParse({ startDate, endDate }).success;

  it('accepts a single-day loan', () => {
    expect(parse('2026-12-01', '2026-12-01')).toBe(true);
  });

  it('rejects an end before the start', () => {
    expect(parse('2026-12-02', '2026-12-01')).toBe(false);
  });

  it(`rejects loans longer than ${String(MAX_LOAN_DAYS)} days`, () => {
    expect(parse('2026-12-01', '2026-12-30')).toBe(true);
    expect(parse('2026-12-01', '2026-12-31')).toBe(false);
  });
});
