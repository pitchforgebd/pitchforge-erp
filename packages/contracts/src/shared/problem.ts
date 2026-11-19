import { z } from 'zod';

import { ERROR_CODES } from '@pitchforge/shared-kernel';
import type { ErrorCode as KernelErrorCode } from '@pitchforge/shared-kernel';

export const ErrorCode = z
  .enum(ERROR_CODES as unknown as [KernelErrorCode, ...KernelErrorCode[]])
  .meta({ id: 'ErrorCode', description: 'Stable error code; the UI switches on this.' });
export type ErrorCode = z.infer<typeof ErrorCode>;

/**
 * RFC 9457 problem+json. Errors carry a stable code and a request id, never stack traces,
 * SQL or internal paths (security architecture §4).
 */
export const Problem = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int().min(400).max(599),
    code: ErrorCode,
    detail: z.string().optional(),
    requestId: z.string(),
    /** Field-level problems for VALIDATION. */
    errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  })
  .meta({ id: 'Problem' });
export type Problem = z.infer<typeof Problem>;

/** The HTTP status each code is returned with. */
export const ERROR_STATUS: Readonly<Record<ErrorCode, number>> = {
  VALIDATION: 422,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  STALE_VERSION: 412,
  PERIOD_LOCKED: 409,
  SOD_VIOLATION: 403,
  NOT_BALANCED: 422,
  CURRENCY_MISMATCH: 422,
  // eslint-disable-next-line pitchforge/no-float-money -- an HTTP status code, not an amount
  AMOUNT_OUT_OF_RANGE: 422,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  INVALID_TWO_FACTOR_CODE: 401,
  INVALID_RESET_TOKEN: 400,
  ACCOUNT_LOCKED: 423,
  STEP_UP_REQUIRED: 403,
  RATE_LIMITED: 429,
  IDEMPOTENCY_CONFLICT: 409,
  INVALID_STATE: 409,
  INTERNAL_ERROR: 500,
  ALREADY_REVERSED: 409,
  CONTROL_ACCOUNT: 422,
  EQUITY_NOT_100_PERCENT: 422,
  WEIGHTS_NOT_100_PERCENT: 422,
  DUPLICATE_RECORD: 409,
  // eslint-disable-next-line pitchforge/no-float-money -- an HTTP status code, not an amount
  INSUFFICIENT_WITHDRAWABLE_BALANCE: 422,
  FILE_NOT_AVAILABLE: 409,
};
