import type { ReactNode } from 'react';

import { formatMoney, unwrap, parseMoney } from '@pitchforge/shared-kernel';
import type { FormatMoneyOptions } from '@pitchforge/shared-kernel';

import { cn } from '../lib/cn.ts';

export interface MoneyValue {
  /** Decimal string from the API, e.g. "125000.00". */
  readonly amount: string;
  readonly currency: string;
}

export interface MoneyProps extends FormatMoneyOptions {
  readonly value: MoneyValue;
  readonly className?: string;
}

/**
 * The one way to show money: ৳1,25,000, tabular digits, never wrapped. Display only: it does
 * no arithmetic, so no total, tax or balance is ever calculated in the browser.
 */
export function Money({ value, className, ...options }: MoneyProps): ReactNode {
  const parsed = unwrap(parseMoney(value.amount, value.currency));
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {formatMoney(parsed, options)}
    </span>
  );
}
