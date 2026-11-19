import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/domain-error.ts';

import { ROUNDING_MODE, divideRounded } from './rounding.ts';

describe('divideRounded (half away from zero)', () => {
  it('declares its mode', () => {
    expect(ROUNDING_MODE).toBe('half-away-from-zero');
  });

  it.each([
    [5n, 2n, 3n], // 2.5 → 3
    [-5n, 2n, -3n], // -2.5 → -3
    [1n, 2n, 1n], // 0.5 → 1
    [-1n, 2n, -1n], // -0.5 → -1
    [4n, 3n, 1n], // 1.333 → 1
    [5n, 3n, 2n], // 1.667 → 2
    [-5n, 3n, -2n],
    [1n, 3n, 0n],
    [-1n, 3n, 0n],
    [0n, 7n, 0n],
    [6n, 3n, 2n], // exact
    [5n, -2n, -3n], // negative denominator
    [-5n, -2n, 3n],
  ])('%d / %d → %d', (n, d, expected) => {
    expect(divideRounded(n, d)).toBe(expected);
  });

  it('refuses division by zero', () => {
    expect(() => divideRounded(1n, 0n)).toThrow(DomainError);
  });

  const nonZero = fc.bigInt({ min: -(10n ** 12n), max: 10n ** 12n }).filter((d) => d !== 0n);
  const any = fc.bigInt({ min: -(10n ** 24n), max: 10n ** 24n });

  it('is never more than half a unit from the exact quotient', () => {
    fc.assert(
      fc.property(any, nonZero, (n, d) => {
        const q = divideRounded(n, d);
        const error = n - q * d; // exact − rounded, scaled by d
        const absError = error < 0n ? -error : error;
        const absD = d < 0n ? -d : d;
        return absError * 2n <= absD;
      }),
    );
  });

  it('is symmetric, so a reversal rounds to exactly the negative', () => {
    fc.assert(fc.property(any, nonZero, (n, d) => divideRounded(-n, d) === -divideRounded(n, d)));
  });
});
