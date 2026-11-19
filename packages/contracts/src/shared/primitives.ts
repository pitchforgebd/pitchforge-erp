import { z } from 'zod';

import {
  CURRENCY_CODES,
  isPositive,
  isZero,
  parseBusinessDate,
  parseDocumentNo,
  parseMoney,
  parseRate,
  toDecimalString,
  unwrap,
} from '@pitchforge/shared-kernel';
import type {
  CurrencyCode as KernelCurrency,
  Money as KernelMoney,
} from '@pitchforge/shared-kernel';

export const Uuid = z.uuid().meta({ id: 'Uuid', description: 'UUID, lowercase canonical form.' });
export type Uuid = z.infer<typeof Uuid>;

/** Business date: a calendar date with no time or zone (Asia/Dhaka). */
export const IsoDate = z.iso
  .date()
  .refine((text) => parseBusinessDate(text).ok, 'Not a valid business date')
  .meta({ id: 'IsoDate', description: 'Business date, YYYY-MM-DD.', example: '2026-11-04' });
export type IsoDate = z.infer<typeof IsoDate>;

/** A moment in time: ISO 8601 UTC. */
export const Timestamp = z.iso.datetime().meta({
  id: 'Timestamp',
  description: 'ISO 8601 timestamp in UTC.',
  example: '2026-11-04T08:30:00Z',
});
export type Timestamp = z.infer<typeof Timestamp>;

export const DocumentNo = z
  .string()
  .refine((text) => parseDocumentNo(text).ok, 'Not a document number')
  .meta({
    id: 'DocumentNo',
    description: 'Human document number, PREFIX-FYFY-NNNNN.',
    example: 'BILL-2627-00187',
  });
export type DocumentNo = z.infer<typeof DocumentNo>;

export const CurrencyCode = z.enum(CURRENCY_CODES as [KernelCurrency, ...KernelCurrency[]]).meta({
  id: 'CurrencyCode',
  description: 'ISO 4217 currency code.',
});
export type CurrencyCode = z.infer<typeof CurrencyCode>;

/**
 * Non-negative decimal multiplier with up to 6 decimals: tax, withholding or exchange rate.
 * "0.15" means 15%. A string, never a float.
 */
export const Rate = z
  .string()
  .refine((text) => parseRate(text).ok, 'Not a rate')
  .meta({ id: 'Rate', description: 'Decimal rate as a string, e.g. "0.15".', example: '0.15' });
export type Rate = z.infer<typeof Rate>;

/** A percentage with up to 2 decimals as a string: "33.33". */
export const Percent = z
  .string()
  .regex(/^[0-9]{1,3}$|^[0-9]{1,3}\.[0-9]{1,2}$/, 'Not a percentage')
  .refine((text) => {
    const parsed = parseRate(text);
    return parsed.ok && parsed.value.scaled <= 100_000_000n;
  }, 'A percentage is at most 100')
  .meta({ id: 'Percent', description: 'Percentage from 0 to 100.', example: '33.33' });
export type Percent = z.infer<typeof Percent>;

/** A non-negative quantity with up to 3 decimals as a string: hours, days, units. Never a float. */
export const Quantity = z
  .string()
  .regex(/^[0-9]{1,9}$|^[0-9]{1,9}\.[0-9]{1,3}$/, 'Not a quantity')
  .meta({ id: 'Quantity', description: 'Decimal quantity as a string.', example: '7.5' });
export type Quantity = z.infer<typeof Quantity>;

/** A calendar month: payroll and attendance months. */
export const YearMonth = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])$/, 'Not a YYYY-MM month')
  .meta({ id: 'YearMonth', description: 'Calendar month, YYYY-MM.', example: '2026-10' });
export type YearMonth = z.infer<typeof YearMonth>;

/** 4-digit ledger account code. */
export const AccountCode = z
  .string()
  .regex(/^[0-9]{4}$/, 'An account code has 4 digits')
  .meta({ id: 'AccountCode', description: '4-digit ledger account code.', example: '5410' });
export type AccountCode = z.infer<typeof AccountCode>;

/** Free text with a limit, trimmed. Required reasons (rejection, reversal) use this. */
export const Reason = z.string().trim().min(3).max(500);

/** Masked sensitive value: the server sends only the last 4 characters. */
export const Masked = z
  .string()
  .regex(/^•+[0-9A-Za-z]{0,4}$/, 'Must be masked except the last 4 characters')
  .meta({
    id: 'Masked',
    description: 'Masked value; only the last 4 characters are visible.',
    example: '••••••1234',
  });
export type Masked = z.infer<typeof Masked>;

const wireMoney = z.strictObject({
  amount: z.string().meta({ description: 'Decimal string, e.g. "125000.00".' }),
  currency: CurrencyCode,
});

function isCanonical(value: z.infer<typeof wireMoney>): boolean {
  const parsed = parseMoney(value.amount, value.currency);
  return parsed.ok && toDecimalString(parsed.value) === value.amount;
}

/**
 * Money on the wire: `{ "amount": "125000.00", "currency": "BDT" }`. Always a decimal string
 * with every fraction digit of the currency, never a float (api-design.md).
 */
export const Money = wireMoney
  .refine(isCanonical, 'Amount must be a decimal string with exactly the currency’s decimals')
  .meta({ id: 'Money', example: { amount: '125000.00', currency: 'BDT' } });
export type Money = z.infer<typeof Money>;

/** Convert a validated wire value to the kernel's Money. Used at the API edge only. */
export function toMoney(value: Money): KernelMoney {
  return unwrap(parseMoney(value.amount, value.currency));
}

/** Convert the kernel's Money to the wire format. */
export function fromMoney(value: KernelMoney): Money {
  return { amount: toDecimalString(value), currency: value.currency };
}

/** Money that must be above zero: payment and drawing amounts entered by a user. */
export const PositiveMoney = Money.refine(
  (value) => !isCanonical(value) || isPositive(toMoney(value)),
  'Amount must be above zero',
).meta({ id: 'PositiveMoney' });

/** Money that must not be negative. */
export const NonNegativeMoney = Money.refine((value) => {
  if (!isCanonical(value)) return true;
  const parsed = toMoney(value);
  return isPositive(parsed) || isZero(parsed);
}, 'Amount must not be negative').meta({ id: 'NonNegativeMoney' });
