import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/domain-error.ts';
import { unwrap } from '../errors/result.ts';

import { amountInWords, integerToWords, pick } from './amount-in-words.ts';
import { parseMoney } from './decimal.ts';

describe('integerToWords (lakh / crore)', () => {
  it.each([
    [0n, 'Zero'],
    [5n, 'Five'],
    [13n, 'Thirteen'],
    [20n, 'Twenty'],
    [21n, 'Twenty One'],
    [99n, 'Ninety Nine'],
    [100n, 'One Hundred'],
    [101n, 'One Hundred One'],
    [999n, 'Nine Hundred Ninety Nine'],
    [1000n, 'One Thousand'],
    [1001n, 'One Thousand One'],
    [100_000n, 'One Lakh'],
    [125_000n, 'One Lakh Twenty Five Thousand'],
    [12_345_678n, 'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight'],
    [10_000_000n, 'One Crore'],
    [1_000_000_000n, 'One Hundred Crore'],
    [1_000_000_000_000n, 'One Lakh Crore'],
  ])('%d → %s', (n, words) => {
    expect(integerToWords(n)).toBe(words);
  });

  it('refuses negative numbers', () => {
    expect(() => integerToWords(-1n)).toThrow(DomainError);
  });
});

describe('pick', () => {
  it('returns the word or throws on an out-of-range index', () => {
    expect(pick(['a', 'b'], 1)).toBe('b');
    expect(() => pick(['a', 'b'], 2)).toThrow(DomainError);
    expect(() => pick(['a', 'b'], -1)).toThrow(DomainError);
  });
});

describe('amountInWords', () => {
  const bdt = (text: string) => unwrap(parseMoney(text, 'BDT'));

  it.each([
    ['125000.50', 'Taka One Lakh Twenty Five Thousand and Paisa Fifty Only'],
    ['125000', 'Taka One Lakh Twenty Five Thousand Only'],
    ['0', 'Taka Zero Only'],
    ['0.05', 'Taka Zero and Paisa Five Only'],
    ['-1500', 'Minus Taka One Thousand Five Hundred Only'],
  ])('৳%s → %s', (text, words) => {
    expect(amountInWords(bdt(text))).toBe(words);
  });

  it('is defined for BDT only', () => {
    expect(() => amountInWords(unwrap(parseMoney('1.00', 'USD')))).toThrow(DomainError);
  });
});
