import { z } from 'zod';

/** Machine-readable codes carried by every expected backend error; the web app maps them to text. */
export const ErrorCode = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CONFLICT: 'CONFLICT',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const appErrorDataSchema = z.object({
  code: z.enum(ErrorCode),
  message: z.string(),
});

/** Payload of a `ConvexError` thrown for an expected failure. */
export type AppErrorData = z.infer<typeof appErrorDataSchema>;

export function isAppErrorData(value: unknown): value is AppErrorData {
  return appErrorDataSchema.safeParse(value).success;
}
