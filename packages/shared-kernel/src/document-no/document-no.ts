import { DomainError } from '../errors/domain-error.ts';
import { invalid, ok } from '../errors/result.ts';
import type { Result } from '../errors/result.ts';

/**
 * Human document numbers: PREFIX-FYFY-NNNNN, e.g. INV-2627-00045 (SRS conventions; 5 digits
 * decided in the Phase 0 plan, Q8). Gap-free per type and fiscal year for tax documents; the
 * sequence itself comes from the numbering service, not from here.
 */
export interface DocumentNumber {
  /** 2–6 capital letters: INV, BILL, JE, PO, GRN, PAY … */
  readonly prefix: string;
  /** Fiscal year code, e.g. "2627" for July 2026 – June 2027. */
  readonly fiscalYearCode: string;
  /** 1 or more. Printed with at least 5 digits; 100000 and up print in full. */
  readonly sequence: number;
}

export const DOCUMENT_SEQUENCE_DIGITS = 5;

const PREFIX = /^[A-Z]{2,6}$/;
const FISCAL_YEAR_CODE = /^[0-9]{4}$/;
const DOCUMENT_NO = /^[A-Z]{2,6}-[0-9]{4}-[0-9]{5,15}$/;

function check(doc: DocumentNumber): string | null {
  if (!PREFIX.test(doc.prefix))
    return `Document prefix must be 2–6 capital letters: "${doc.prefix}"`;
  if (!FISCAL_YEAR_CODE.test(doc.fiscalYearCode)) {
    return `Fiscal year code must be 4 digits: "${doc.fiscalYearCode}"`;
  }
  if (!Number.isSafeInteger(doc.sequence) || doc.sequence < 1) {
    return `Document sequence must be a positive integer: ${String(doc.sequence)}`;
  }
  return null;
}

export function formatDocumentNo(doc: DocumentNumber): string {
  const problem = check(doc);
  if (problem !== null) throw new DomainError('VALIDATION', problem);
  const sequence = String(doc.sequence).padStart(DOCUMENT_SEQUENCE_DIGITS, '0');
  return `${doc.prefix}-${doc.fiscalYearCode}-${sequence}`;
}

/** Parse "INV-2627-00045". Only the canonical form is accepted (no extra leading zeros). */
export function parseDocumentNo(text: string): Result<DocumentNumber> {
  if (!DOCUMENT_NO.test(text)) return invalid(`Not a document number: "${text}"`);
  // The pattern guarantees exactly three dash-separated parts.
  const [prefix, fiscalYearCode, sequence] = text.split('-') as [string, string, string];
  const doc: DocumentNumber = { prefix, fiscalYearCode, sequence: Number(sequence) };
  const problem = check(doc);
  if (problem !== null) return invalid(problem);
  if (formatDocumentNo(doc) !== text) return invalid(`Not a canonical document number: "${text}"`);
  return ok(doc);
}
