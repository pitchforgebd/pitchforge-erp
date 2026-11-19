import { DomainError } from '../errors/domain-error.ts';
import { invalid, ok } from '../errors/result.ts';
import type { Result } from '../errors/result.ts';

import { addDays, addMonths, businessDate, dateParts } from './business-date.ts';
import type { BusinessDate } from './business-date.ts';

/** Bangladesh fiscal year: July to June (configurable per company, SRS conventions). */
export const DEFAULT_FISCAL_YEAR_START_MONTH = 7;

export interface FiscalYear {
  /** Calendar year the fiscal year starts in: 2026 for July 2026 – June 2027. */
  readonly startYear: number;
  readonly endYear: number;
  /** Used in document numbers: "2627". */
  readonly code: string;
  /** For display: "2026–27" (en dash), or "2026" when the fiscal year is the calendar year. */
  readonly label: string;
  readonly start: BusinessDate;
  readonly end: BusinessDate;
  readonly startMonth: number;
}

export interface FiscalPeriod {
  readonly fiscalYear: FiscalYear;
  /** 1–12; period 1 is the fiscal year's first month (July by default). */
  readonly number: number;
  readonly start: BusinessDate;
  readonly end: BusinessDate;
}

function assertStartMonth(startMonth: number): void {
  if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
    throw new DomainError(
      'VALIDATION',
      `Fiscal year start month must be 1–12, got ${String(startMonth)}`,
    );
  }
}

function twoDigits(year: number): string {
  return String(year % 100).padStart(2, '0');
}

export function fiscalYearStartingIn(
  startYear: number,
  startMonth: number = DEFAULT_FISCAL_YEAR_START_MONTH,
): FiscalYear {
  assertStartMonth(startMonth);
  const start = businessDate(startYear, startMonth, 1);
  const end = addDays(addMonths(start, 12), -1);
  const endYear = dateParts(end).year;
  return {
    startYear,
    endYear,
    code: `${twoDigits(startYear)}${twoDigits(endYear)}`,
    label: startYear === endYear ? String(startYear) : `${String(startYear)}–${twoDigits(endYear)}`,
    start,
    end,
    startMonth,
  };
}

/** The fiscal year a business date falls in. */
export function fiscalYearOf(
  date: BusinessDate,
  startMonth: number = DEFAULT_FISCAL_YEAR_START_MONTH,
): FiscalYear {
  assertStartMonth(startMonth);
  const { year, month } = dateParts(date);
  return fiscalYearStartingIn(month >= startMonth ? year : year - 1, startMonth);
}

/** The monthly fiscal period (1–12) a business date falls in. */
export function fiscalPeriodOf(
  date: BusinessDate,
  startMonth: number = DEFAULT_FISCAL_YEAR_START_MONTH,
): FiscalPeriod {
  const fiscalYear = fiscalYearOf(date, startMonth);
  const { month } = dateParts(date);
  const number = ((month - startMonth + 12) % 12) + 1;
  const start = addMonths(fiscalYear.start, number - 1);
  return { fiscalYear, number, start, end: addDays(addMonths(start, 1), -1) };
}

const CODE = /^([0-9]{2})([0-9]{2})$/;

/** Parse a document-number fiscal-year code ("2627") for years 2000–2099. */
export function parseFiscalYearCode(
  code: string,
  startMonth: number = DEFAULT_FISCAL_YEAR_START_MONTH,
): Result<FiscalYear> {
  assertStartMonth(startMonth);
  const match = CODE.exec(code);
  if (!match) return invalid(`Not a fiscal year code: "${code}"`);
  const fy = fiscalYearStartingIn(2000 + Number(match[1]), startMonth);
  return fy.code === code ? ok(fy) : invalid(`Not a fiscal year code: "${code}"`);
}
