/**
 * GOLDEN EXAMPLES: for the accountant to review and sign (Phase 0 plan, step 0.4 and Q9).
 *
 * Each row states what the system will print or compute for a typical case. If a row is
 * wrong, change the expected value here first, then the code until the test passes. Rows
 * marked PROVISIONAL depend on the open rounding and display decisions.
 *
 * Sign-off:  name ______________________   date ___________
 */
import { describe, expect, it } from 'vitest';

import { unwrap } from '../errors/result.ts';

import { allocate } from './allocate.ts';
import { amountInWords } from './amount-in-words.ts';
import { parseMoney, toDecimalString } from './decimal.ts';
import { formatMoney } from './format.ts';
import { negate } from './money.ts';
import { multiplyByRate, parseRate } from './rate.ts';

const bdt = (text: string) => unwrap(parseMoney(text, 'BDT'));
const rate = (text: string) => unwrap(parseRate(text));

describe('golden: display', () => {
  it.each([
    ['125000.00', '৳1,25,000'], // PROVISIONAL: zero paisa hidden
    ['125000.50', '৳1,25,000.50'],
    ['12500000.00', '৳1,25,00,000'], // one crore twenty-five lakh
    ['999.99', '৳999.99'],
    ['-45000.00', '-৳45,000'],
  ])('৳%s displays as %s', (text, shown) => {
    expect(formatMoney(bdt(text))).toBe(shown);
  });

  it('ledger columns always show paisa', () => {
    expect(formatMoney(bdt('125000'), { decimals: 'always' })).toBe('৳1,25,000.00');
  });
});

describe('golden: amount in words (invoices, receipts, cheques)', () => {
  it.each([
    ['125000.00', 'Taka One Lakh Twenty Five Thousand Only'],
    ['12500000.00', 'Taka One Crore Twenty Five Lakh Only'],
    ['1234.56', 'Taka One Thousand Two Hundred Thirty Four and Paisa Fifty Six Only'],
  ])('৳%s → %s', (text, words) => {
    expect(amountInWords(bdt(text))).toBe(words);
  });
});

describe('golden: rounding (PROVISIONAL, half away from zero)', () => {
  it.each([
    ['1000.00', '0.15', '150.00'], // 15% VAT, exact
    ['333.33', '0.15', '50.00'], // 49.9995 → 50.00
    ['0.10', '0.15', '0.02'], // 0.015 → 0.02 (half-even would give 0.02 too)
    ['0.30', '0.15', '0.05'], // 0.045 → 0.05 (half-even would give 0.04)
    ['12345.67', '0.10', '1234.57'], // 10% AIT: 1234.567 → 1234.57
  ])('৳%s × %s = ৳%s', (base, r, expected) => {
    expect(toDecimalString(multiplyByRate(bdt(base), rate(r)))).toBe(expected);
  });

  it('a reversal rounds to exactly the negative of the original', () => {
    const original = multiplyByRate(bdt('0.30'), rate('0.15'));
    const reversal = multiplyByRate(negate(bdt('0.30')), rate('0.15'));
    expect(reversal).toEqual(negate(original));
  });
});

describe('golden: profit distribution', () => {
  it('৳10,00,000.01 among three equal partners: the two leftover poisha go to the first two', () => {
    expect(allocate(bdt('1000000.01'), [1n, 1n, 1n]).map(toDecimalString)).toEqual([
      '333333.34',
      '333333.34',
      '333333.33',
    ]);
  });
});
