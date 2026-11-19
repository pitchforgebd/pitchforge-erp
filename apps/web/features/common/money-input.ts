import { parseMoney, toDecimalString } from '@pitchforge/shared-kernel';

export interface MoneyValue {
  readonly amount: string;
  readonly currency: 'BDT';
}

/**
 * Reads an amount as people type it ("1,60,000" or "160000.5") into the API's form
 * ("160000.50"). Only the format changes: no amount is added, rounded or worked out here.
 * Returns null for anything that is not an amount.
 */
export function moneyFromInput(text: string): MoneyValue | null {
  const cleaned = text.replaceAll(',', '').replaceAll(' ', '').trim();
  // Digits, points and a leading minus only; parseMoney rejects a second point or extra digits.
  if (cleaned === '' || !/^-?[0-9.]+$/.test(cleaned)) return null;
  const parsed = parseMoney(cleaned, 'BDT');
  return parsed.ok ? { amount: toDecimalString(parsed.value), currency: 'BDT' } : null;
}
