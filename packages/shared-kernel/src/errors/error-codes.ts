/**
 * Stable error codes (UPPER_SNAKE). The API returns them in problem+json `code`, the UI
 * switches on them, and they never change meaning once published.
 */
export const ERROR_CODES = [
  'VALIDATION',
  'NOT_FOUND',
  'FORBIDDEN',
  'STALE_VERSION',
  'PERIOD_LOCKED',
  'SOD_VIOLATION',
  'NOT_BALANCED',
  'CURRENCY_MISMATCH',
  'AMOUNT_OUT_OF_RANGE',
  // Authentication and sessions
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'INVALID_TWO_FACTOR_CODE',
  'INVALID_RESET_TOKEN',
  'ACCOUNT_LOCKED',
  'STEP_UP_REQUIRED',
  'RATE_LIMITED',
  // Request handling
  'IDEMPOTENCY_CONFLICT',
  'INVALID_STATE',
  'INTERNAL_ERROR',
  // Business rules
  'ALREADY_REVERSED',
  'CONTROL_ACCOUNT',
  'EQUITY_NOT_100_PERCENT',
  'WEIGHTS_NOT_100_PERCENT',
  'DUPLICATE_RECORD',
  'INSUFFICIENT_WITHDRAWABLE_BALANCE',
  'FILE_NOT_AVAILABLE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const CODES: ReadonlySet<string> = new Set(ERROR_CODES);

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && CODES.has(value);
}
