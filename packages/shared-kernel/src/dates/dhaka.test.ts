import { describe, expect, it } from 'vitest';

import { parseBusinessDate } from './business-date.ts';
import { BUSINESS_TIME_ZONE, formatDateTime, toBusinessDate, todayInDhaka } from './dhaka.ts';

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
