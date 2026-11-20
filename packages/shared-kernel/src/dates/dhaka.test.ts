import { describe, expect, it } from 'vitest';

import { unwrap } from '../errors/result.ts';

import { parseBusinessDate } from './business-date.ts';
import {
  BUSINESS_TIME_ZONE,
  formatDateTime,
  fromDhakaWallClock,
  toBusinessDate,
  toDhakaWallClock,
  todayInDhaka,
} from './dhaka.ts';

describe('Asia/Dhaka', () => {
  it('is the business time zone', () => {
    expect(BUSINESS_TIME_ZONE).toBe('Asia/Dhaka');
  });

  it('changes date at midnight Dhaka time (18:00 UTC)', () => {
    expect(toBusinessDate(new Date('2026-11-03T17:59:59Z'))).toBe('2026-11-03');
    expect(toBusinessDate(new Date('2026-11-03T18:00:00Z'))).toBe('2026-11-04');
  });

  it('a 30 June 23:30 Dhaka entry belongs to 30 June, not 1 July (fiscal year end)', () => {
    expect(toBusinessDate(new Date('2027-06-30T17:30:00Z'))).toBe('2027-06-30');
  });

  it('todayInDhaka uses the given clock, or the real one', () => {
    expect(todayInDhaka(new Date('2026-11-04T05:00:00Z'))).toBe('2026-11-04');
    expect(parseBusinessDate(todayInDhaka()).ok).toBe(true);
  });

  it('formats date and 24-hour time in Dhaka', () => {
    expect(formatDateTime(new Date('2026-11-04T08:30:00Z'))).toBe('04 Nov 2026, 14:30');
    expect(formatDateTime(new Date('2026-11-03T18:05:00Z'))).toBe('04 Nov 2026, 00:05');
  });
});

describe('Dhaka wall clock', () => {
  const date = unwrap(parseBusinessDate('2026-11-20'));

  it('turns a Dhaka date and time into the UTC instant', () => {
    expect(fromDhakaWallClock(date, '09:00')?.toISOString()).toBe('2026-11-20T03:00:00.000Z');
    expect(fromDhakaWallClock(date, '23:59')?.toISOString()).toBe('2026-11-20T17:59:00.000Z');
  });

  it('crosses midnight into the previous UTC day', () => {
    expect(fromDhakaWallClock(date, '03:30')?.toISOString()).toBe('2026-11-19T21:30:00.000Z');
  });

  it('refuses a time that is not HH:MM', () => {
    expect(fromDhakaWallClock(date, '9:00')).toBeUndefined();
    expect(fromDhakaWallClock(date, '24:00')).toBeUndefined();
    expect(fromDhakaWallClock(date, '')).toBeUndefined();
  });

  it('reads an instant back as the same Dhaka date and time', () => {
    const instant = new Date('2026-11-19T21:30:00.000Z');
    expect(toDhakaWallClock(instant)).toEqual({ date: '2026-11-20', time: '03:30' });
    const back = fromDhakaWallClock(toDhakaWallClock(instant).date, toDhakaWallClock(instant).time);
    expect(back?.toISOString()).toBe(instant.toISOString());
  });
});
