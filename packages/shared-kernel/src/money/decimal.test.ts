import { describe, expect, it } from 'vitest';

import { unwrap } from '../errors/result.ts';

import { fromMajor, parseMoney, toDecimalString } from './decimal.ts';
import { money } from './money.ts';

describe('parseMoney', () => {
  it.each([
    ['125000.00', 12_500_000n],
    ['125000', 12_500_000n],
    ['125000.5', 12_500_050n],
    ['0', 0n],
    ['0.05', 5n],
    ['-0.5', -50n],
    ['-0.00', 0n],
    ['7', 700n],
    ['92233720368547758.07', 2n ** 63n - 1n],
    ['-92233720368547758.08', -(2n ** 63n)],
  ])('BDT "%s" → %d poisha', (text, minor) => {
    expect(unwrap(parseMoney(text, 'BDT'))).toEqual(money(minor, 'BDT'));
  });

  it('parses currencies without minor units', () => {
    expect(unwrap(parseMoney('1000', 'JPY'))).toEqual(money(1000n, 'JPY'));
    expect(parseMoney('1000.0', 'JPY').ok).toBe(false);
  });

  it.each([
    '1,000.00', // grouping
    ' 1.00', // whitespace
    '1.00 ',
    '+1.00', // explicit plus
    '1e5', // exponent
    '01.00', // leading zero
    '1.', // empty fraction
    '.50', // empty integer
    '1.2.3', // two points
    '1.234', // too many decimals: never silently rounded
    '-',
    '--1',
    'abc',
    '',
    '1.-5',
  ])('rejects "%s"', (text) => {
    const r = parseMoney(text, 'BDT');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('VALIDATION');
  });

  it('rejects an unsupported currency', () => {
    expect(parseMoney('1.00', 'XXX').ok).toBe(false);
  });

  it('rejects amounts outside the BIGINT range', () => {
    const r = parseMoney('92233720368547758.08', 'BDT');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('AMOUNT_OUT_OF_RANGE');
  });
});

describe('toDecimalString', () => {
  it.each([
    [12_500_000n, 'BDT', '125000.00'],
    [5n, 'BDT', '0.05'],
    [-50n, 'BDT', '-0.50'],
    [0n, 'BDT', '0.00'],
    [100n, 'JPY', '100'],
    [-7n, 'JPY', '-7'],
  ] as const)('%d %s → "%s"', (minor, currency, text) => {
    expect(toDecimalString(money(minor, currency))).toBe(text);
  });
});

describe('fromMajor', () => {
  it('scales by the currency exponent', () => {
    expect(fromMajor(125_000n, 'BDT')).toEqual(money(12_500_000n, 'BDT'));
    expect(fromMajor(5n, 'JPY')).toEqual(money(5n, 'JPY'));
  });
});
