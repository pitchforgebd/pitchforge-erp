import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/domain-error.ts';
import { unwrap } from '../errors/result.ts';

import { DOCUMENT_SEQUENCE_DIGITS, formatDocumentNo, parseDocumentNo } from './document-no.ts';

describe('formatDocumentNo', () => {
  it('pads the sequence to 5 digits', () => {
    expect(DOCUMENT_SEQUENCE_DIGITS).toBe(5);
    expect(formatDocumentNo({ prefix: 'INV', fiscalYearCode: '2627', sequence: 45 })).toBe(
      'INV-2627-00045',
    );
    expect(formatDocumentNo({ prefix: 'JE', fiscalYearCode: '2627', sequence: 413 })).toBe(
      'JE-2627-00413',
    );
  });

  it('prints sequences beyond 99999 in full', () => {
    expect(formatDocumentNo({ prefix: 'JE', fiscalYearCode: '2627', sequence: 123_456 })).toBe(
      'JE-2627-123456',
    );
  });

  it.each([
    { prefix: 'inv', fiscalYearCode: '2627', sequence: 1 },
    { prefix: 'I', fiscalYearCode: '2627', sequence: 1 },
    { prefix: 'TOOLONG', fiscalYearCode: '2627', sequence: 1 },
    { prefix: 'INV', fiscalYearCode: '262', sequence: 1 },
    { prefix: 'INV', fiscalYearCode: '2627', sequence: 0 },
    { prefix: 'INV', fiscalYearCode: '2627', sequence: 1.5 },
    { prefix: 'INV', fiscalYearCode: '2627', sequence: Number.NaN },
    { prefix: 'INV', fiscalYearCode: '2627', sequence: 2 ** 53 },
  ])('rejects %o', (doc) => {
    expect(() => formatDocumentNo(doc)).toThrow(DomainError);
  });
});

describe('parseDocumentNo', () => {
  it('parses the canonical form', () => {
    expect(unwrap(parseDocumentNo('BILL-2627-00187'))).toEqual({
      prefix: 'BILL',
      fiscalYearCode: '2627',
      sequence: 187,
    });
    expect(unwrap(parseDocumentNo('JE-2627-123456')).sequence).toBe(123_456);
  });

  it.each([
    'BILL-2627-0187', // 4 digits (old examples in the docs)
    'INV-2627-012345', // extra leading zero: not canonical
    'INV-2627-00000', // sequence 0
    'inv-2627-00045',
    'INV-26-00045',
    'INV202700045',
    'INV-2627-9999999999999999', // longer than 15 digits
    '',
  ])('rejects %s', (text) => {
    expect(parseDocumentNo(text).ok).toBe(false);
  });

  it('round-trips any valid number', () => {
    const prefixArb = fc.stringMatching(/^[A-Z]{2,6}$/);
    const fyArb = fc.stringMatching(/^[0-9]{4}$/);
    const seqArb = fc.integer({ min: 1, max: 10_000_000 });
    fc.assert(
      fc.property(prefixArb, fyArb, seqArb, (prefix, fiscalYearCode, sequence) => {
        const text = formatDocumentNo({ prefix, fiscalYearCode, sequence });
        const parsed = unwrap(parseDocumentNo(text));
        return (
          parsed.prefix === prefix &&
          parsed.fiscalYearCode === fiscalYearCode &&
          parsed.sequence === sequence
        );
      }),
    );
  });
});
