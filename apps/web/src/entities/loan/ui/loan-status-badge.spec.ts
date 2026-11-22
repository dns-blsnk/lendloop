import { LoanStatus } from '@lendloop/contracts';
import { describe, expect, it } from 'vitest';

import { statusLook } from './loan-status-badge';

describe('statusLook', () => {
  it('lets overdue outrank the stored status', () => {
    expect(statusLook(LoanStatus.APPROVED, true)).toEqual({ label: 'Overdue', tone: 'danger' });
    expect(statusLook(LoanStatus.APPROVED, false).label).toBe('Approved');
  });
});
