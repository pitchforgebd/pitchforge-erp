import { DomainError } from '../errors/domain-error.ts';

import { money } from './money.ts';
import type { Money } from './money.ts';

/**
 * Split an amount by integer ratios without losing or inventing a single poisha
 * (largest-remainder method). Used for profit distribution by equity, project splits and
 * payroll cost allocation.
 *
 * - The shares always sum exactly to the original amount.
 * - Each share is within one minor unit of its exact value.
 * - A zero ratio always gets exactly zero.
 * - Leftover minor units go to the largest remainders; ties go to the earlier ratio, so the
 *   result is deterministic.
 * - A negative amount is split as its absolute value and negated, so allocating a reversal
 *   gives exactly the negatives of the original shares.
 *
 * Ratios are integers: pass basis points (3333n, 3333n, 3334n) for percentages with decimals.
 */
export function allocate(m: Money, ratios: readonly bigint[]): Money[] {
  if (ratios.length === 0) throw new DomainError('VALIDATION', 'allocate needs at least one ratio');
  let ratioTotal = 0n;
  for (const r of ratios) {
    if (r < 0n) throw new DomainError('VALIDATION', 'allocate ratios must not be negative');
    ratioTotal += r;
  }
  if (ratioTotal === 0n)
    throw new DomainError('VALIDATION', 'allocate ratios must not all be zero');

  const negative = m.minor < 0n;
  const whole = negative ? -m.minor : m.minor;

  const floors = ratios.map((r) => (whole * r) / ratioTotal);
  const allocated = floors.reduce((acc, s) => acc + s, 0n);
  const leftover = Number(whole - allocated); // always < ratios.length, so a safe integer

  const receivesExtra = new Set(
    ratios
      .map((r, index) => ({ index, remainder: (whole * r) % ratioTotal }))
      .sort((a, b) => {
        if (a.remainder === b.remainder) return a.index - b.index;
        return a.remainder > b.remainder ? -1 : 1;
      })
      .slice(0, leftover)
      .map((x) => x.index),
  );

  return floors.map((s, index) => {
    const share = s + (receivesExtra.has(index) ? 1n : 0n);
    return money(negative ? -share : share, m.currency);
  });
}
