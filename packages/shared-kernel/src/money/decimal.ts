import { DomainError } from '../errors/domain-error.ts';
import { err, invalid, ok } from '../errors/result.ts';
import type { Result } from '../errors/result.ts';

import { currencyInfo, isCurrencyCode } from './currency.ts';
import type { CurrencyCode } from './currency.ts';
import { MAX_MINOR, MIN_MINOR, money } from './money.ts';
import type { Money } from './money.ts';

// Split on "." first so each regex is a single, linear pattern.
const INTEGER_PART = /^-?(0|[1-9][0-9]*)$/;
const FRACTION_PART = /^[0-9]+$/;

/**
 * Parse a decimal string such as "125000.00", "-0.5" or "7" into Money.
 *
 * Strict by design: no thousands separators, spaces, "+", exponents or leading zeros, and no
 * more fraction digits than the currency has (extra digits are an error, never rounded away).
 * This is the API wire format (`{ amount: "125000.00", currency: "BDT" }`).
 */
export function parseMoney(text: string, currency: string): Result<Money> {
  if (!isCurrencyCode(currency)) return invalid(`Unsupported currency: ${currency}`);
  const { exponent } = currencyInfo(currency);

  const parts = text.split('.');
  if (parts.length > 2) return invalid('Amount has more than one decimal point');
  const [integerPart = '', fractionPart] = parts;

  if (!INTEGER_PART.test(integerPart)) return invalid(`Not a decimal amount: "${text}"`);
  if (fractionPart !== undefined) {
    if (!FRACTION_PART.test(fractionPart)) return invalid(`Not a decimal amount: "${text}"`);
    if (fractionPart.length > exponent) {
      return invalid(`${currency} allows at most ${String(exponent)} decimal places`);
    }
  }

  const negative = integerPart.startsWith('-');
  const digits =
    (negative ? integerPart.slice(1) : integerPart) + (fractionPart ?? '').padEnd(exponent, '0');
  const magnitude = BigInt(digits);
  const minor = negative ? -magnitude : magnitude;
  if (minor < MIN_MINOR || minor > MAX_MINOR) {
    return err(new DomainError('AMOUNT_OUT_OF_RANGE', 'Amount does not fit in a 64-bit integer'));
  }
  return ok(money(minor, currency));
}

/** "125000.00" style: always every fraction digit of the currency, no grouping, "-" sign. */
export function toDecimalString(m: Money): string {
  const { exponent } = currencyInfo(m.currency);
  const negative = m.minor < 0n;
  const digits = (negative ? -m.minor : m.minor).toString().padStart(exponent + 1, '0');
  const integerPart = digits.slice(0, digits.length - exponent);
  const fraction = exponent > 0 ? `.${digits.slice(digits.length - exponent)}` : '';
  return `${negative ? '-' : ''}${integerPart}${fraction}`;
}

/** Major-unit amount helper for constants and tests: fromMajor(125000n, 'BDT') = ৳1,25,000.00 */
export function fromMajor(major: bigint, currency: CurrencyCode): Money {
  return money(major * 10n ** BigInt(currencyInfo(currency).exponent), currency);
}
