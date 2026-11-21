import {
  addDays,
  addMonths,
  businessDate,
  dateParts,
  fiscalYearOf,
  fiscalYearStartingIn,
  todayInDhaka,
} from '@pitchforge/shared-kernel';
import type { BusinessDate, FiscalYear } from '@pitchforge/shared-kernel';

/**
 * Dates a screen starts from: today in Dhaka and the periods around it. They are defaults for
 * forms and filters only; the server decides which periods are open and what falls in them.
 * Call them when rendering, not at module load, so a page left open past midnight moves on.
 */

export const today = (): BusinessDate => todayInDhaka();

export const inDays = (days: number): BusinessDate => addDays(today(), days);

export function monthStart(date: BusinessDate): BusinessDate {
  const { year, month } = dateParts(date);
  return businessDate(year, month, 1);
}

export const monthEnd = (date: BusinessDate): BusinessDate =>
  addDays(addMonths(monthStart(date), 1), -1);

export const nextMonthStart = (): BusinessDate => addMonths(monthStart(today()), 1);

/** The last day of the month before this one: the latest month whose books can be closed. */
export const lastClosedMonthEnd = (): BusinessDate => addDays(monthStart(today()), -1);

export const currentFiscalYear = (): FiscalYear => fiscalYearOf(today());

export const previousFiscalYear = (): FiscalYear =>
  fiscalYearStartingIn(currentFiscalYear().startYear - 1);

/** The same date a year earlier, for "compare with last year". */
export const yearBefore = (date: BusinessDate): BusinessDate => addMonths(date, -12);

/** The next Saturday, when a Bangladesh work week starts (today if it is Saturday). */
export function nextWeekStart(): BusinessDate {
  const { year, month, day } = dateParts(today());
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const SATURDAY = 6;
  return inDays((SATURDAY - weekday + 7) % 7);
}
