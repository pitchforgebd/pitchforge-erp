/**
 * Property tests (testing strategy: money maths carries the heaviest tests). Each property
 * runs against hundreds of generated cases on every PR.
 */
import fc from 'fast-check';
import { describe, it } from 'vitest';

import { unwrap } from '../errors/result.ts';

import { allocate } from './allocate.ts';
import { CURRENCY_CODES } from './currency.ts';
import { parseMoney, toDecimalString } from './decimal.ts';
import { formatMoney } from './format.ts';
import { add, equals, money, negate, subtract, sum } from './money.ts';
import { multiplyByRate, parseRate } from './rate.ts';

const LIMIT = 10n ** 15n; // ৳10 lakh crore: far above any real document
const minorArb = fc.bigInt({ min: -LIMIT, max: LIMIT });
const bdtArb = minorArb.map((minor) => money(minor, 'BDT'));
const currencyArb = fc.constantFrom(...CURRENCY_CODES);
const ratiosArb = fc
  .array(fc.bigInt({ min: 0n, max: 10_000n }), { minLength: 1, maxLength: 12 })
  .filter((rs) => rs.some((r) => r > 0n));

describe('money properties', () => {
  it('add and subtract are inverse', () => {
    fc.assert(fc.property(bdtArb, bdtArb, (a, b) => equals(subtract(add(a, b), b), a)));
  });

  it('add is commutative and associative; sum agrees with repeated add', () => {
    fc.assert(
      fc.property(bdtArb, bdtArb, bdtArb, (a, b, c) => {
        return (
          equals(add(a, b), add(b, a)) &&
          equals(add(add(a, b), c), add(a, add(b, c))) &&
          equals(sum([a, b, c], 'BDT'), add(add(a, b), c))
        );
      }),
    );
  });

  it('decimal strings round-trip exactly in every currency (no float drift)', () => {
    fc.assert(
      fc.property(minorArb, currencyArb, (minor, currency) => {
        const m = money(minor, currency);
        return equals(unwrap(parseMoney(toDecimalString(m), currency)), m);
      }),
    );
  });

  it('formatting never loses digits: removing grouping gives the decimal string', () => {
    fc.assert(
      fc.property(bdtArb, (m) => {
        const shown = formatMoney(m, { decimals: 'always', display: 'none' }).replaceAll(',', '');
        return shown === toDecimalString(m);
      }),
    );
  });
});

describe('allocate properties', () => {
  it('shares always sum exactly to the original amount', () => {
    fc.assert(
      fc.property(bdtArb, ratiosArb, (m, ratios) => equals(sum(allocate(m, ratios), 'BDT'), m)),
    );
  });

  it('each share is within one poisha of its exact value', () => {
    fc.assert(
      fc.property(bdtArb, ratiosArb, (m, ratios) => {
        const total = ratios.reduce((acc, r) => acc + r, 0n);
        return allocate(m, ratios).every((share, i) => {
          const exactTimesTotal = m.minor * (ratios.at(i) ?? 0n);
          const diff = share.minor * total - exactTimesTotal;
          return (diff < 0n ? -diff : diff) < total;
        });
      }),
    );
  });

  it('zero ratios get zero', () => {
    fc.assert(
      fc.property(bdtArb, ratiosArb, (m, ratios) =>
        allocate(m, ratios).every((share, i) => ratios.at(i) !== 0n || share.minor === 0n),
      ),
    );
  });

  it('allocating a reversal gives exactly the negated shares', () => {
    fc.assert(
      fc.property(bdtArb, ratiosArb, (m, ratios) => {
        const forward = allocate(m, ratios);
        const reverse = allocate(negate(m), ratios);
        return forward.every((share, i) => {
          const other = reverse.at(i);
          return other !== undefined && equals(negate(share), other);
        });
      }),
    );
  });
});

describe('rate properties', () => {
  const rateArb = fc
    .bigInt({ min: 0n, max: 1_000_000_000n })
    .map((scaled) =>
      unwrap(
        parseRate(
          `${(scaled / 1_000_000n).toString()}.${(scaled % 1_000_000n).toString().padStart(6, '0')}`,
        ),
      ),
    );

  it('multiplyByRate is within half a poisha of the exact product', () => {
    fc.assert(
      fc.property(bdtArb, rateArb, (m, rate) => {
        const result = multiplyByRate(m, rate);
        const diff = result.minor * 1_000_000n - m.minor * rate.scaled;
        return (diff < 0n ? -diff : diff) * 2n <= 1_000_000n;
      }),
    );
  });

  it('multiplyByRate of a negated amount is the negated result', () => {
    fc.assert(
      fc.property(bdtArb, rateArb, (m, rate) =>
        equals(multiplyByRate(negate(m), rate), negate(multiplyByRate(m, rate))),
      ),
    );
  });
});
