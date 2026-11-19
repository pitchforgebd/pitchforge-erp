import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/domain-error.ts';

import {
  BASE_CURRENCY,
  CURRENCY_CODES,
  currencyInfo,
  isCurrencyCode,
  minorUnitsPerMajor,
} from './currency.ts';
import type { CurrencyCode } from './currency.ts';
import {
  MAX_MINOR,
  MIN_MINOR,
  abs,
  add,
  compare,
  equals,
  isNegative,
  isPositive,
  isZero,
  money,
  negate,
  subtract,
  sum,
  zero,
} from './money.ts';

const bdt = (minor: bigint) => money(minor, 'BDT');
const usd = (minor: bigint) => money(minor, 'USD');

function domainError(fn: () => unknown): DomainError {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e;
    throw e;
  }
  throw new Error('expected a DomainError');
}

describe('currency', () => {
  it('BDT is the base currency, with 100 poisha per taka', () => {
    expect(BASE_CURRENCY).toBe('BDT');
    expect(minorUnitsPerMajor('BDT')).toBe(100n);
    expect(currencyInfo('BDT')).toEqual({ exponent: 2, symbol: '৳', grouping: 'lakh' });
  });

  it('knows currencies without minor units', () => {
    expect(minorUnitsPerMajor('JPY')).toBe(1n);
  });

  it('lists and recognises supported codes only', () => {
    expect(CURRENCY_CODES).toContain('BDT');
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode('usd')).toBe(false);
    expect(isCurrencyCode(1)).toBe(false);
  });

  it('rejects an unsupported code from untyped callers', () => {
    expect(domainError(() => currencyInfo('XXX' as CurrencyCode)).code).toBe('VALIDATION');
  });
});

describe('money()', () => {
  it('creates an immutable value', () => {
    const m = bdt(12_500_000n);
    expect(m.minor).toBe(12_500_000n);
    expect(m.currency).toBe('BDT');
    expect(Object.isFrozen(m)).toBe(true);
  });

  it('refuses a JavaScript number', () => {
    const e = domainError(() => money(125 as unknown as bigint, 'BDT'));
    expect(e.code).toBe('VALIDATION');
  });

  it('refuses an unsupported currency', () => {
    expect(domainError(() => money(1n, 'XXX' as CurrencyCode)).code).toBe('VALIDATION');
  });

  it('accepts the full BIGINT range and nothing beyond it', () => {
    expect(bdt(MAX_MINOR).minor).toBe(MAX_MINOR);
    expect(bdt(MIN_MINOR).minor).toBe(MIN_MINOR);
    expect(domainError(() => bdt(MAX_MINOR + 1n)).code).toBe('AMOUNT_OUT_OF_RANGE');
    expect(domainError(() => bdt(MIN_MINOR - 1n)).code).toBe('AMOUNT_OUT_OF_RANGE');
    expect(domainError(() => add(bdt(MAX_MINOR), bdt(1n))).code).toBe('AMOUNT_OUT_OF_RANGE');
  });

  it('zero()', () => {
    expect(zero('USD')).toEqual(usd(0n));
  });
});

describe('arithmetic', () => {
  it('adds, subtracts and negates', () => {
    expect(add(bdt(150n), bdt(25n))).toEqual(bdt(175n));
    expect(subtract(bdt(150n), bdt(175n))).toEqual(bdt(-25n));
    expect(negate(bdt(25n))).toEqual(bdt(-25n));
    expect(negate(bdt(-25n))).toEqual(bdt(25n));
  });

  it('abs', () => {
    expect(abs(bdt(-25n))).toEqual(bdt(25n));
    expect(abs(bdt(25n))).toEqual(bdt(25n));
  });

  it('sums a list, and an empty list to zero in the given currency', () => {
    expect(sum([bdt(1n), bdt(2n), bdt(3n)], 'BDT')).toEqual(bdt(6n));
    expect(sum([], 'USD')).toEqual(usd(0n));
  });

  it('refuses to mix currencies', () => {
    const e = domainError(() => add(bdt(1n), usd(1n)));
    expect(e.code).toBe('CURRENCY_MISMATCH');
    expect(e.details).toEqual({ left: 'BDT', right: 'USD' });
    expect(() => subtract(bdt(1n), usd(1n))).toThrow(DomainError);
    expect(() => compare(bdt(1n), usd(1n))).toThrow(DomainError);
    expect(() => sum([usd(1n)], 'BDT')).toThrow(DomainError);
  });
});

describe('comparison', () => {
  it('compare', () => {
    expect(compare(bdt(1n), bdt(2n))).toBe(-1);
    expect(compare(bdt(2n), bdt(2n))).toBe(0);
    expect(compare(bdt(3n), bdt(2n))).toBe(1);
  });

  it('equals needs the same amount and currency', () => {
    expect(equals(bdt(1n), bdt(1n))).toBe(true);
    expect(equals(bdt(1n), bdt(2n))).toBe(false);
    expect(equals(bdt(1n), usd(1n))).toBe(false);
  });

  it('sign predicates', () => {
    expect(isZero(bdt(0n))).toBe(true);
    expect(isZero(bdt(1n))).toBe(false);
    expect(isNegative(bdt(-1n))).toBe(true);
    expect(isNegative(bdt(0n))).toBe(false);
    expect(isPositive(bdt(1n))).toBe(true);
    expect(isPositive(bdt(0n))).toBe(false);
  });
});
