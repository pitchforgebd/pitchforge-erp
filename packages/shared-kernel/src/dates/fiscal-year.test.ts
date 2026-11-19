import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/domain-error.ts';
import { unwrap } from '../errors/result.ts';

import { addDays, compareDates, parseBusinessDate } from './business-date.ts';
import {
  DEFAULT_FISCAL_YEAR_START_MONTH,
  fiscalPeriodOf,
  fiscalYearOf,
  fiscalYearStartingIn,
  parseFiscalYearCode,
} from './fiscal-year.ts';

const d = (text: string) => unwrap(parseBusinessDate(text));

describe('fiscal year (July–June)', () => {
  it('defaults to a July start', () => {
    expect(DEFAULT_FISCAL_YEAR_START_MONTH).toBe(7);
  });

  it('04 Nov 2026 is in FY 2026–27, code 2627', () => {
    expect(fiscalYearOf(d('2026-11-04'))).toEqual({
      startYear: 2026,
      endYear: 2027,
      code: '2627',
      label: '2026–27',
      start: '2026-07-01',
      end: '2027-06-30',
      startMonth: 7,
    });
  });

  it('30 June and 1 July fall either side of the boundary', () => {
    expect(fiscalYearOf(d('2026-06-30')).code).toBe('2526');
    expect(fiscalYearOf(d('2026-07-01')).code).toBe('2627');
  });

  it('handles the century boundary', () => {
    expect(fiscalYearStartingIn(2099).code).toBe('9900');
    expect(fiscalYearStartingIn(2099).label).toBe('2099–00');
  });

  it('supports a calendar-year fiscal year', () => {
    const fy = fiscalYearOf(d('2026-11-04'), 1);
    expect(fy.code).toBe('2626');
    expect(fy.label).toBe('2026');
    expect(fy.end).toBe('2026-12-31');
  });

  it.each([0, 13, 1.5])('rejects start month %s', (month) => {
    expect(() => fiscalYearStartingIn(2026, month)).toThrow(DomainError);
    expect(() => fiscalYearOf(d('2026-11-04'), month)).toThrow(DomainError);
    expect(() => parseFiscalYearCode('2627', month)).toThrow(DomainError);
  });
});

describe('fiscal periods', () => {
  it.each([
    ['2026-07-15', 1, '2026-07-01', '2026-07-31'],
    ['2026-11-04', 5, '2026-11-01', '2026-11-30'],
    ['2028-02-10', 8, '2028-02-01', '2028-02-29'],
    ['2027-06-30', 12, '2027-06-01', '2027-06-30'],
  ])('%s is period %d (%s – %s)', (date, number, start, end) => {
    const p = fiscalPeriodOf(d(date));
    expect([p.number, p.start, p.end]).toEqual([number, start, end]);
  });

  it('calendar-year periods', () => {
    expect(fiscalPeriodOf(d('2026-03-05'), 1).number).toBe(3);
  });

  it('every date lies inside its period, and the period inside its fiscal year', () => {
    const dateArb = fc
      .integer({ min: 0, max: 365 * 200 })
      .map((offset) => addDays(d('1950-01-01'), offset));
    const monthArb = fc.integer({ min: 1, max: 12 });
    fc.assert(
      fc.property(dateArb, monthArb, (date, startMonth) => {
        const p = fiscalPeriodOf(date, startMonth);
        return (
          p.number >= 1 &&
          p.number <= 12 &&
          compareDates(p.start, date) <= 0 &&
          compareDates(date, p.end) <= 0 &&
          compareDates(p.fiscalYear.start, p.start) <= 0 &&
          compareDates(p.end, p.fiscalYear.end) <= 0
        );
      }),
    );
  });
});

describe('parseFiscalYearCode', () => {
  it('parses a July–June code', () => {
    expect(unwrap(parseFiscalYearCode('2627')).startYear).toBe(2026);
    expect(unwrap(parseFiscalYearCode('9900')).startYear).toBe(2099);
  });

  it.each(['2628', '2626', 'abcd', '262', '26277'])('rejects %s for July–June', (code) => {
    expect(parseFiscalYearCode(code).ok).toBe(false);
  });

  it('a calendar fiscal year uses the same two digits twice', () => {
    expect(parseFiscalYearCode('2626', 1).ok).toBe(true);
    expect(parseFiscalYearCode('2627', 1).ok).toBe(false);
  });
});
