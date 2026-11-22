import { ErrorCode } from '@lendloop/contracts';
import { ConvexError } from 'convex/values';
import { describe, expect, it } from 'vitest';

import { errorMessage } from './error-message';

describe('errorMessage', () => {
  it('shows the message of an expected backend error', () => {
    const error = new ConvexError({ code: ErrorCode.CONFLICT, message: 'Already booked.' });
    expect(errorMessage(error)).toBe('Already booked.');
  });

  it('hides anything unexpected behind a generic line', () => {
    expect(errorMessage(new Error('TypeError at line 3'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
