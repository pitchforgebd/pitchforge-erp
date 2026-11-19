/**
 * @pitchforge/shared-kernel: framework-free building blocks used by every app.
 * No runtime dependencies (enforced by dependency-cruiser); runs in Node and the browser.
 */
export * from './dates/index.ts';
export {
  DOCUMENT_SEQUENCE_DIGITS,
  formatDocumentNo,
  parseDocumentNo,
} from './document-no/document-no.ts';
export type { DocumentNumber } from './document-no/document-no.ts';
export { DomainError, isDomainError } from './errors/domain-error.ts';
export type { ErrorDetails } from './errors/domain-error.ts';
export { ERROR_CODES, isErrorCode } from './errors/error-codes.ts';
export type { ErrorCode } from './errors/error-codes.ts';
export { err, invalid, ok, unwrap } from './errors/result.ts';
export type { Result } from './errors/result.ts';
export * from './ids/index.ts';
export * from './money/index.ts';
