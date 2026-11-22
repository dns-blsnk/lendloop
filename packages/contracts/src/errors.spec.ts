import { describe, expect, it } from 'vitest';

import { ErrorCode, isAppErrorData } from './errors';

describe('isAppErrorData', () => {
  it('accepts a known code with a message', () => {
    expect(isAppErrorData({ code: ErrorCode.FORBIDDEN, message: 'No' })).toBe(true);
  });

  it('rejects unknown codes and other shapes', () => {
    expect(isAppErrorData({ code: 'NOPE', message: 'No' })).toBe(false);
    expect(isAppErrorData('FORBIDDEN')).toBe(false);
  });
});
