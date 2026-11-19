import { DomainError } from '../errors/domain-error.ts';

import { currencyInfo } from './currency.ts';
import type { CurrencyCode } from './currency.ts';

declare const moneyBrand: unique symbol;

/**
 * An amount of money: an integer number of minor units (poisha for BDT) plus its currency.
 * Never a float (CLAUDE.md rule 3). Values are immutable and created only through `money()`
 * or the functions in this package, which validate currency and range.
 */
export interface Money {
  /** Integer minor units: poisha for BDT, cents for USD. */
  readonly minor: bigint;
  readonly currency: CurrencyCode;
  readonly [moneyBrand]: true;
}

/** PostgreSQL BIGINT range: every Money must fit a journal_line debit/credit column. */
export const MIN_MINOR = -(2n ** 63n);
export const MAX_MINOR = 2n ** 63n - 1n;

export function money(minor: bigint, currency: CurrencyCode): Money {
  if (typeof minor !== 'bigint') {
    throw new DomainError('VALIDATION', 'Money minor units must be a bigint, never a number');
  }
  currencyInfo(currency); // throws on an unsupported currency
  if (minor < MIN_MINOR || minor > MAX_MINOR) {
    throw new DomainError('AMOUNT_OUT_OF_RANGE', 'Amount does not fit in a 64-bit integer', {
      currency,
    });
  }
  return Object.freeze({ minor, currency }) as Money;
}

export function zero(currency: CurrencyCode): Money {
  return money(0n, currency);
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new DomainError('CURRENCY_MISMATCH', `Cannot combine ${a.currency} with ${b.currency}`, {
      left: a.currency,
      right: b.currency,
    });
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor + b.minor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor - b.minor, a.currency);
}

export function negate(a: Money): Money {
  return money(-a.minor, a.currency);
}

export function abs(a: Money): Money {
  return a.minor < 0n ? negate(a) : a;
}

/** Sum of a list; the currency is required so an empty list has a defined result. */
export function sum(items: readonly Money[], currency: CurrencyCode): Money {
  return items.reduce((acc, m) => add(acc, m), zero(currency));
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.minor === b.minor) return 0;
  return a.minor < b.minor ? -1 : 1;
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.minor === b.minor;
}

export function isZero(a: Money): boolean {
  return a.minor === 0n;
}

export function isNegative(a: Money): boolean {
  return a.minor < 0n;
}

export function isPositive(a: Money): boolean {
  return a.minor > 0n;
}
