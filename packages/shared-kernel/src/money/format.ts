import { currencyInfo } from './currency.ts';
import type { Grouping } from './currency.ts';
import { toDecimalString } from './decimal.ts';
import type { Money } from './money.ts';

export interface FormatMoneyOptions {
  /** Digit grouping. Default: the currency's (lakh for BDT: ৳1,25,000; international: 125,000). */
  readonly grouping?: Grouping;
  /**
   * 'auto' hides the fraction when it is zero (৳1,25,000) and shows it otherwise
   * (৳1,25,000.50); 'always' always shows it (৳1,25,000.00), e.g. in ledger columns.
   * Default 'auto', the convention in CLAUDE.md. PROVISIONAL until the accountant confirms (Q9).
   */
  readonly decimals?: 'auto' | 'always';
  /** 'symbol' (৳), 'code' (BDT 1,25,000) or 'none'. Currencies without a symbol use the code. */
  readonly display?: 'symbol' | 'code' | 'none';
  /** '-৳500' or the accounting style '(৳500)'. */
  readonly negative?: 'minus' | 'parentheses';
}

/** Group an unsigned digit string: lakh "12345678" → "1,23,45,678"; international → "12,345,678". */
export function groupDigits(digits: string, grouping: Grouping): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const size = grouping === 'lakh' ? 2 : 3;
  const groups: string[] = [];
  for (let end = rest.length; end > 0; end -= size) {
    groups.unshift(rest.slice(Math.max(0, end - size), end));
  }
  return `${groups.join(',')},${lastThree}`;
}

/**
 * Display formatting only: no arithmetic, no rounding. Every amount the UI shows goes
 * through this (via the <Money> component), so formatting is identical everywhere.
 */
export function formatMoney(m: Money, options: FormatMoneyOptions = {}): string {
  const info = currencyInfo(m.currency);
  const grouping = options.grouping ?? info.grouping;
  const decimals = options.decimals ?? 'auto';
  const display = options.display ?? 'symbol';
  const negativeStyle = options.negative ?? 'minus';

  const plain = toDecimalString(m);
  const unsigned = plain.startsWith('-') ? plain.slice(1) : plain;
  const [integerPart = '', fraction = ''] = unsigned.split('.');
  const showFraction = fraction.length > 0 && (decimals === 'always' || /[1-9]/.test(fraction));
  const number = groupDigits(integerPart, grouping) + (showFraction ? `.${fraction}` : '');

  let prefix = '';
  if (display === 'symbol') prefix = info.symbol ?? `${m.currency} `;
  if (display === 'code') prefix = `${m.currency} `;
  const body = `${prefix}${number}`;

  if (m.minor >= 0n) return body;
  return negativeStyle === 'parentheses' ? `(${body})` : `-${body}`;
}
