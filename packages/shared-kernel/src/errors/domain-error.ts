import type { ErrorCode } from './error-codes.ts';

export type ErrorDetails = Readonly<Record<string, string | number | boolean | null>>;

/**
 * A typed business-rule error. Controllers map `code` to a problem+json response; the
 * message is for logs and developers and must not contain personal data or amounts tied to
 * a person (secure coding checklist).
 */
export class DomainError extends Error {
  override readonly name = 'DomainError';
  readonly code: ErrorCode;
  readonly details: ErrorDetails;

  constructor(code: ErrorCode, message: string, details: ErrorDetails = {}) {
    super(message);
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export function isDomainError(value: unknown, code?: ErrorCode): value is DomainError {
  return value instanceof DomainError && (code === undefined || value.code === code);
}
