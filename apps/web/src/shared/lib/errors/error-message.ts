import { ErrorCode, isAppErrorData } from '@lendloop/contracts';
import { ConvexError } from 'convex/values';

const FALLBACK: Readonly<Record<ErrorCode, string>> = {
  [ErrorCode.UNAUTHENTICATED]: 'Please sign in again.',
  [ErrorCode.FORBIDDEN]: 'You are not allowed to do this.',
  [ErrorCode.NOT_FOUND]: 'This no longer exists.',
  [ErrorCode.VALIDATION_FAILED]: 'Please check the form.',
  [ErrorCode.CONFLICT]: 'Something changed in the meantime. Please try again.',
  [ErrorCode.INVALID_TRANSITION]: 'This action is not possible any more.',
  [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait a little.',
};

const UNEXPECTED = 'Something went wrong. Please try again.';

/**
 * Text for a failed Convex call. Expected failures carry a code and a message written for people;
 * anything else (network, bugs) gets a generic line so no internals reach the screen.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && isAppErrorData(error.data)) {
    return error.data.message === '' ? FALLBACK[error.data.code] : error.data.message;
  }
  return UNEXPECTED;
}
