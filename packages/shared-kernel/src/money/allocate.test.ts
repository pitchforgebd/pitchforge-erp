import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/domain-error.ts';
import { unwrap } from '../errors/result.ts';

import { allocate } from './allocate.ts';
import { parseMoney, toDecimalString } from './decimal.ts';
import type { Money } from './money.ts';

const bdt = (text: string) => unwrap(parseMoney(text, 'BDT'));
const texts = (shares: Money[]) => shares.map(toDecimalString);

describe('allocate', () => {
  it('splits ৳100 three ways without losing a poisha; the tie goes to the first share', () => {
    expect(texts(allocate(bdt('100.00'), [1n, 1n, 1n]))).toEqual(['33.34', '33.33', '33.33']);
  });

  it('gives leftovers to the largest remainders', () => {
    // 1.01 by 1:2:2 = 0.202, 0.404, 0.404: floors 20, 40, 40 with remainders 1, 2, 2 (of 5),
    // so the one leftover poisha goes to the first of the two largest: the second share.
    expect(texts(allocate(bdt('1.01'), [1n, 2n, 2n]))).toEqual(['0.20', '0.41', '0.40']);
    // 0.05 by 1:1:3 = 0.01, 0.01, 0.03 exactly
    expect(texts(allocate(bdt('0.05'), [1n, 1n, 3n]))).toEqual(['0.01', '0.01', '0.03']);
    // 0.10 by 1:1:1 = 0.0333…: one leftover poisha to the first share
    expect(texts(allocate(bdt('0.10'), [1n, 1n, 1n]))).toEqual(['0.04', '0.03', '0.03']);
    // remainders 0.0x: 0.07 by 3:3:1 = 0.03, 0.03, 0.01 exactly
    expect(texts(allocate(bdt('0.07'), [3n, 3n, 1n]))).toEqual(['0.03', '0.03', '0.01']);
  });

  it('splits partner equity in basis points (33.33% / 33.33% / 33.34%)', () => {
    expect(texts(allocate(bdt('100000.00'), [3333n, 3333n, 3334n]))).toEqual([
      '33330.00',
      '33330.00',
      '33340.00',
    ]);
  });

  it('gives exactly zero to a zero ratio', () => {
    expect(texts(allocate(bdt('0.01'), [0n, 1n, 1n]))).toEqual(['0.00', '0.01', '0.00']);
  });

  it('splits a negative amount as the exact negative of the positive split', () => {
    expect(texts(allocate(bdt('-100.00'), [1n, 1n, 1n]))).toEqual(['-33.34', '-33.33', '-33.33']);
  });

  it('splits zero into zeros and keeps the currency', () => {
    const shares = allocate(bdt('0.00'), [1n, 2n]);
    expect(texts(shares)).toEqual(['0.00', '0.00']);
    expect(shares.every((s) => s.currency === 'BDT')).toBe(true);
  });

  it.each([
    [[], 'at least one ratio'],
    [[1n, -1n], 'must not be negative'],
    [[0n, 0n], 'must not all be zero'],
  ])('rejects ratios [%s]', (ratios, message) => {
    expect(() => allocate(bdt('1.00'), ratios)).toThrow(DomainError);
    expect(() => allocate(bdt('1.00'), ratios)).toThrow(message);
  });
});
