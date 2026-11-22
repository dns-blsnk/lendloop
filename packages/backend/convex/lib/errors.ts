import { ConvexError } from 'convex/values';

import type { AppErrorData, ErrorCode } from '@lendloop/contracts';

/** The only way to signal an expected failure; the web app reads `code` to choose the message. */
export function domainError(code: ErrorCode, message: string): ConvexError<AppErrorData> {
  return new ConvexError({ code, message });
}
