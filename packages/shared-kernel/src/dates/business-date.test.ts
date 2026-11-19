import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/domain-error.ts';
import { unwrap } from '../errors/result.ts';

import {
  MONTH_ABBREVIATIONS,
  addDays,
  addMonths,
  businessDate,
  compareDates,
  dateParts,
  daysBetween,
  formatDate,
  monthAbbreviation,
  parseBusinessDate,
} from './business-date.ts';

const d = (text: string) => unwrap(parseBusinessDate(text));

describe('parseBusinessDate', () => {
  it.each(['2026-11-04', '2028-02-29', '1900-01-01', '9999-12-31'])('accepts %s', (text) => {
    expect(d(text)).toBe(text);
  });

  it.each([
    '2026-02-29', // not a leap year
    '2026-02-30',
    '2026-13-01',
    '2026-00-10',
    '2026-11-00',
    '2026-11-31',
    '1899-12-31', // before 1900
    '26-11-04',
    '2026-11-4',
    '2026/11/04',
    '04 Nov 2026',
    '',
  ])('rejects %s', (text) => {
    expect(parseBusinessDate(text).ok).toBe(false);
  });
});

describe('businessDate / dateParts', () => {
  it('builds and splits a date', () => {
    expect(businessDate(2026, 11, 4)).toBe('2026-11-04');
    expect(dateParts(d('2026-11-04'))).toEqual({ year: 2026, month: 11, day: 4 });
  });

  it('throws on an impossible date', () => {
    expect(() => businessDate(2026, 2, 30)).toThrow(DomainError);
  });
});

describe('date arithmetic', () => {
  it('addDays across month and year ends', () => {
    expect(addDays(d('2026-11-30'), 1)).toBe('2026-12-01');
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(d('2026-01-01'), -1)).toBe('2025-12-31');
    expect(addDays(d('2028-02-28'), 1)).toBe('2028-02-29');
    expect(() => addDays(d('2026-01-01'), 1.5)).toThrow(DomainError);
  });

  it('addMonths clamps to the end of the month', () => {
    expect(addMonths(d('2027-01-31'), 1)).toBe('2027-02-28');
    expect(addMonths(d('2028-01-31'), 1)).toBe('2028-02-29');
    expect(addMonths(d('2026-01-15'), -1)).toBe('2025-12-15');
    expect(addMonths(d('2026-07-01'), 12)).toBe('2027-07-01');
    expect(() => addMonths(d('2026-01-01'), 0.5)).toThrow(DomainError);
  });

  it('daysBetween and compareDates', () => {
    expect(daysBetween(d('2026-11-04'), d('2026-12-04'))).toBe(30);
    expect(daysBetween(d('2026-12-04'), d('2026-11-04'))).toBe(-30);
    expect(compareDates(d('2026-11-04'), d('2026-11-05'))).toBe(-1);
    expect(compareDates(d('2026-11-04'), d('2026-11-04'))).toBe(0);
    expect(compareDates(d('2026-12-01'), d('2026-11-30'))).toBe(1);
  });
});

describe('display', () => {
  it('formats DD MMM YYYY', () => {
    expect(formatDate(d('2026-11-04'))).toBe('04 Nov 2026');
    expect(formatDate(d('2027-01-31'))).toBe('31 Jan 2027');
  });

  it('month abbreviations', () => {
    expect(MONTH_ABBREVIATIONS).toHaveLength(12);
    expect(monthAbbreviation(1)).toBe('Jan');
    expect(monthAbbreviation(12)).toBe('Dec');
    for (const bad of [0, 13, -1, 1.5]) expect(() => monthAbbreviation(bad)).toThrow(DomainError);
  });
});
