import { DomainError } from '../errors/domain-error.ts';

import type { Money } from './money.ts';

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
] as const;

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
] as const;

/** Look up a word; the index is always computed in range, so a miss is a programming error. */
export function pick(words: readonly string[], index: number): string {
  const word = words.at(index);
  if (word === undefined || index < 0) {
    throw new DomainError('VALIDATION', `No word for ${String(index)}`);
  }
  return word;
}

function belowHundred(n: number): string {
  if (n < 20) return pick(ONES, n);
  const tens = pick(TENS, Math.floor(n / 10));
  const ones = n % 10;
  return ones === 0 ? tens : `${tens} ${pick(ONES, ones)}`;
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(`${pick(ONES, hundreds)} Hundred`);
  if (rest > 0) parts.push(belowHundred(rest));
  return parts.join(' ');
}

/**
 * A non-negative integer in English with the South Asian system:
 * 12345678 → "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight".
 * Amounts of 100 crore and more repeat the system: "One Hundred Crore", "One Lakh Crore".
 */
export function integerToWords(n: bigint): string {
  if (n < 0n) throw new DomainError('VALIDATION', 'integerToWords needs a non-negative integer');
  if (n === 0n) return 'Zero';

  const crores = n / 10_000_000n;
  const belowCrore = Number(n % 10_000_000n); // < 10^7, a safe integer
  const lakhs = Math.floor(belowCrore / 100_000);
  const thousands = Math.floor((belowCrore % 100_000) / 1000);
  const rest = belowCrore % 1000;

  const parts: string[] = [];
  if (crores > 0n) parts.push(`${integerToWords(crores)} Crore`);
  if (lakhs > 0) parts.push(`${belowHundred(lakhs)} Lakh`);
  if (thousands > 0) parts.push(`${belowHundred(thousands)} Thousand`);
  if (rest > 0) parts.push(belowThousand(rest));
  return parts.join(' ');
}

/**
 * Amount in words for invoices, receipts and cheques (UX-06), BDT only:
 * ৳1,25,000.50 → "Taka One Lakh Twenty Five Thousand and Paisa Fifty Only".
 * Wording PROVISIONAL until the accountant reviews the golden examples (money/golden.test.ts).
 */
export function amountInWords(m: Money): string {
  if (m.currency !== 'BDT') {
    throw new DomainError(
      'VALIDATION',
      `Amount in words is defined for BDT only, not ${m.currency}`,
    );
  }
  const negative = m.minor < 0n;
  const magnitude = negative ? -m.minor : m.minor;
  const taka = magnitude / 100n;
  const paisa = magnitude % 100n;

  const words = [`Taka ${integerToWords(taka)}`];
  if (paisa > 0n) words.push(`and Paisa ${integerToWords(paisa)}`);
  words.push('Only');
  return `${negative ? 'Minus ' : ''}${words.join(' ')}`;
}
