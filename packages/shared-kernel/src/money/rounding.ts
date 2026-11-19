import { DomainError } from '../errors/domain-error.ts';

/**
 * THE rounding rule for money (coding standards, backend rule 4: "rounding … in one place").
 *
 * Half away from zero: 0.5 → 1, -0.5 → -1, 2.5 → 3. This is "half-up" applied symmetrically,
 * so a reversal rounds to exactly the negative of the original entry.
 *
 * PROVISIONAL (Phase 0 plan, Q9): awaiting the accountant's confirmation. If a different
 * rule is chosen (e.g. half-even), change this function only; the golden tests in
 * money/golden.test.ts show the effect.
 */
export const ROUNDING_MODE = 'half-away-from-zero' as const;

/** numerator / denominator rounded to an integer using ROUNDING_MODE. */
export function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new DomainError('VALIDATION', 'Division by zero');
  const n = denominator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const quotient = n / d; // bigint division truncates toward zero
  const remainder = n % d; // has the sign of n
  const twiceRemainder = (remainder < 0n ? -remainder : remainder) * 2n;
  if (twiceRemainder < d) return quotient;
  return n < 0n ? quotient - 1n : quotient + 1n;
}
