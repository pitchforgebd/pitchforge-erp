import { invalid, ok } from '../errors/result.ts';
import type { Result } from '../errors/result.ts';

import { minorUnitsPerMajor } from './currency.ts';
import type { CurrencyCode } from './currency.ts';
import { money } from './money.ts';
import type { Money } from './money.ts';
import { divideRounded } from './rounding.ts';

declare const rateBrand: unique symbol;

/** Decimal places kept in a rate. Matches `fx_rate numeric(18,6)` in the ledger. */
export const RATE_DECIMALS = 6;
const RATE_SCALE = 10n ** BigInt(RATE_DECIMALS);

/**
 * A non-negative multiplier with up to 6 decimal places: a tax rate (0.15 = 15% VAT), a
 * withholding rate, or an exchange rate (110.25 BDT per USD). Stored as an integer scaled by
 * 10^6, never as a float.
 */
export interface Rate {
  /** The rate × 10^6 as an integer. */
  readonly scaled: bigint;
  readonly [rateBrand]: true;
}

const RATE_TEXT = /^(0|[1-9][0-9]*)$/;
const RATE_FRACTION = /^[0-9]{1,6}$/;

/** Parse "0.15", "110.25" or "1" into a Rate. More than 6 decimals is an error. */
export function parseRate(text: string): Result<Rate> {
  const [whole = '', fraction, extra] = text.split('.');
  if (extra !== undefined || !RATE_TEXT.test(whole)) return invalid(`Not a rate: "${text}"`);
  if (fraction !== undefined && !RATE_FRACTION.test(fraction)) {
    return invalid(`A rate has at most ${String(RATE_DECIMALS)} decimal places: "${text}"`);
  }
  const scaled = BigInt(whole + (fraction ?? '').padEnd(RATE_DECIMALS, '0'));
  return ok(Object.freeze({ scaled }) as Rate);
}

export function rateToString(rate: Rate): string {
  const digits = rate.scaled.toString().padStart(RATE_DECIMALS + 1, '0');
  const whole = digits.slice(0, -RATE_DECIMALS);
  const fraction = digits.slice(-RATE_DECIMALS).replace(/0+$/, '');
  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

/** m × rate, rounded once with the money rounding rule. VAT: multiplyByRate(net, 0.15). */
export function multiplyByRate(m: Money, rate: Rate): Money {
  return money(divideRounded(m.minor * rate.scaled, RATE_SCALE), m.currency);
}

/**
 * Convert to another currency with a manual rate (units of `to` per one unit of `from`),
 * e.g. convert(usd(10), 'BDT', 110.25) = ৳1,102.50. Rounded once.
 */
export function convert(m: Money, to: CurrencyCode, rate: Rate): Money {
  const numerator = m.minor * rate.scaled * minorUnitsPerMajor(to);
  const denominator = RATE_SCALE * minorUnitsPerMajor(m.currency);
  return money(divideRounded(numerator, denominator), to);
}
