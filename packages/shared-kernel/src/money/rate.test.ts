import { describe, expect, it } from 'vitest';

import { unwrap } from '../errors/result.ts';

import { fromMajor, parseMoney } from './decimal.ts';
import { money } from './money.ts';
import { RATE_DECIMALS, convert, multiplyByRate, parseRate, rateToString } from './rate.ts';

const rate = (text: string) => unwrap(parseRate(text));
const bdt = (text: string) => unwrap(parseMoney(text, 'BDT'));

describe('parseRate / rateToString', () => {
  it('keeps 6 decimals, like fx_rate numeric(18,6)', () => {
    expect(RATE_DECIMALS).toBe(6);
  });

  it.each([
    ['0.15', 150_000n, '0.15'],
    ['110.25', 110_250_000n, '110.25'],
    ['1', 1_000_000n, '1'],
    ['0', 0n, '0'],
    ['0.000001', 1n, '0.000001'],
    ['2.500000', 2_500_000n, '2.5'],
  ])('"%s" → %d → "%s"', (text, scaled, printed) => {
    const r = rate(text);
    expect(r.scaled).toBe(scaled);
    expect(rateToString(r)).toBe(printed);
  });

  it.each(['-0.1', '1.1234567', '1.2.3', 'abc', '01.5', '.5', '1.', '', '1e3'])(
    'rejects "%s"',
    (text) => {
      expect(parseRate(text).ok).toBe(false);
    },
  );
});

describe('multiplyByRate', () => {
  it('computes 15% VAT', () => {
    expect(multiplyByRate(bdt('1000.00'), rate('0.15'))).toEqual(bdt('150.00'));
  });

  it('rounds once, half away from zero', () => {
    expect(multiplyByRate(bdt('0.03'), rate('0.5'))).toEqual(bdt('0.02')); // 0.015 → 0.02
    expect(multiplyByRate(bdt('-0.03'), rate('0.5'))).toEqual(bdt('-0.02'));
    expect(multiplyByRate(bdt('0.01'), rate('0.4'))).toEqual(bdt('0.00')); // 0.004 → 0.00
  });
});

describe('convert', () => {
  it('USD → BDT at a manual rate', () => {
    expect(convert(fromMajor(10n, 'USD'), 'BDT', rate('110.25'))).toEqual(bdt('1102.50'));
  });

  it('handles currencies with different exponents in both directions', () => {
    expect(convert(money(1000n, 'JPY'), 'BDT', rate('0.73'))).toEqual(bdt('730.00'));
    expect(convert(bdt('100.00'), 'JPY', rate('1.37'))).toEqual(money(137n, 'JPY'));
  });
});
