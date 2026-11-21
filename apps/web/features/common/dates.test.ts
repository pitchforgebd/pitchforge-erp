import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  currentFiscalYear,
  inDays,
  lastClosedMonthEnd,
  monthEnd,
  monthStart,
  nextMonthStart,
  nextWeekStart,
  previousFiscalYear,
  today,
  yearBefore,
} from './dates.ts';

describe('screen dates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 21 Nov 2026, 10:00 in Dhaka (a Saturday).
    vi.setSystemTime(new Date('2026-11-21T04:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts from today in Dhaka', () => {
    expect(today()).toBe('2026-11-21');
    expect(inDays(30)).toBe('2026-12-21');
  });

  it('knows the month, the last closable month and the next month', () => {
    expect(monthStart(today())).toBe('2026-11-01');
    expect(monthEnd(today())).toBe('2026-11-30');
    expect(lastClosedMonthEnd()).toBe('2026-10-31');
    expect(nextMonthStart()).toBe('2026-12-01');
  });

  it('knows the fiscal year (July to June)', () => {
    expect(currentFiscalYear().code).toBe('2627');
    expect(currentFiscalYear().start).toBe('2026-07-01');
    expect(previousFiscalYear().code).toBe('2526');
    expect(yearBefore(lastClosedMonthEnd())).toBe('2025-10-31');
  });

  it('starts work weeks on Saturday', () => {
    expect(nextWeekStart()).toBe('2026-11-21');
    vi.setSystemTime(new Date('2026-11-22T04:00:00Z'));
    expect(nextWeekStart()).toBe('2026-11-28');
  });

  it('moves on after midnight in Dhaka, not in UTC', () => {
    vi.setSystemTime(new Date('2026-11-21T18:30:00Z'));
    expect(today()).toBe('2026-11-22');
  });
});
