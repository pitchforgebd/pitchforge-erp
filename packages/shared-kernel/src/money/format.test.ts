import { describe, expect, it } from 'vitest';

import { unwrap } from '../errors/result.ts';

import type { CurrencyCode } from './currency.ts';
import { parseMoney } from './decimal.ts';
import { formatMoney, groupDigits } from './format.ts';

const m = (text: string, currency: CurrencyCode = 'BDT') => unwrap(parseMoney(text, currency));

describe('groupDigits', () => {
  it.each([
    ['1', '1'],
    ['999', '999'],
    ['1000', '1,000'],
    ['125000', '1,25,000'],
    ['1250000', '12,50,000'],
    ['12345678', '1,23,45,678'],
    ['1000000000', '1,00,00,00,000'],
  ])('lakh %s → %s', (digits, grouped) => {
    expect(groupDigits(digits, 'lakh')).toBe(grouped);
  });

  it.each([
    ['999', '999'],
    ['1000', '1,000'],
    ['1234567', '1,234,567'],
    ['12345678', '12,345,678'],
  ])('international %s → %s', (digits, grouped) => {
    expect(groupDigits(digits, 'international')).toBe(grouped);
  });
});

describe('formatMoney', () => {
  it('formats BDT with lakh grouping and hides zero paisa by default', () => {
    expect(formatMoney(m('125000.00'))).toBe('৳1,25,000');
    expect(formatMoney(m('0'))).toBe('৳0');
  });

  it('shows paisa when there are any', () => {
    expect(formatMoney(m('125000.50'))).toBe('৳1,25,000.50');
    expect(formatMoney(m('0.05'))).toBe('৳0.05');
  });

  it("always shows paisa with decimals: 'always'", () => {
    expect(formatMoney(m('125000'), { decimals: 'always' })).toBe('৳1,25,000.00');
  });

  it('supports international grouping, code and no symbol', () => {
    expect(formatMoney(m('125000'), { grouping: 'international' })).toBe('৳125,000');
    expect(formatMoney(m('125000'), { display: 'code' })).toBe('BDT 1,25,000');
    expect(formatMoney(m('125000'), { display: 'none' })).toBe('1,25,000');
  });

  it('formats negatives with a minus or in parentheses', () => {
    expect(formatMoney(m('-500'))).toBe('-৳500');
    expect(formatMoney(m('-500'), { negative: 'parentheses' })).toBe('(৳500)');
    expect(formatMoney(m('-0.50'), { negative: 'parentheses', decimals: 'always' })).toBe(
      '(৳0.50)',
    );
  });

  it('uses each currency’s default grouping and symbol', () => {
    expect(formatMoney(m('1234567.89', 'USD'))).toBe('$1,234,567.89');
    expect(formatMoney(m('1000', 'AED'))).toBe('AED 1,000'); // no symbol → code
    expect(formatMoney(m('1000', 'JPY'), { decimals: 'always' })).toBe('¥1,000'); // no minor units
  });
});
