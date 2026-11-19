import { DomainError } from '../errors/domain-error.ts';

export type Grouping = 'lakh' | 'international';

export interface CurrencyInfo {
  /** Number of minor-unit digits (BDT 2: 1 taka = 100 poisha). */
  readonly exponent: number;
  /** Display symbol, or null to show the ISO code instead. */
  readonly symbol: string | null;
  /** Default digit grouping when formatting. */
  readonly grouping: Grouping;
}

/**
 * Supported currencies. BDT is the base currency; the others are for multi-currency
 * documents with a manual rate (FIN-21). Adding a currency is a reviewed change.
 */
const CURRENCIES = {
  BDT: { exponent: 2, symbol: '৳', grouping: 'lakh' },
  USD: { exponent: 2, symbol: '$', grouping: 'international' },
  EUR: { exponent: 2, symbol: '€', grouping: 'international' },
  GBP: { exponent: 2, symbol: '£', grouping: 'international' },
  INR: { exponent: 2, symbol: '₹', grouping: 'lakh' },
  SGD: { exponent: 2, symbol: 'S$', grouping: 'international' },
  MYR: { exponent: 2, symbol: 'RM', grouping: 'international' },
  AED: { exponent: 2, symbol: null, grouping: 'international' },
  CNY: { exponent: 2, symbol: 'CN¥', grouping: 'international' },
  JPY: { exponent: 0, symbol: '¥', grouping: 'international' },
} as const satisfies Record<string, CurrencyInfo>;

export type CurrencyCode = keyof typeof CURRENCIES;

export const BASE_CURRENCY: CurrencyCode = 'BDT';

const BY_CODE: ReadonlyMap<string, CurrencyInfo> = new Map(Object.entries(CURRENCIES));

export const CURRENCY_CODES = Object.freeze([...BY_CODE.keys()]) as readonly CurrencyCode[];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && BY_CODE.has(value);
}

export function currencyInfo(code: CurrencyCode): CurrencyInfo {
  const info = BY_CODE.get(code);
  // Reachable only from untyped callers (plain JS, unchecked casts).
  if (info === undefined) throw new DomainError('VALIDATION', `Unsupported currency: ${code}`);
  return info;
}

/** 10^exponent as a bigint: the number of minor units in one major unit. */
export function minorUnitsPerMajor(code: CurrencyCode): bigint {
  return 10n ** BigInt(currencyInfo(code).exponent);
}
