import { DomainError } from '../errors/domain-error.ts';
import { invalid, ok } from '../errors/result.ts';
import type { Result } from '../errors/result.ts';
import type { Brand } from '../ids/brand.ts';

/**
 * A calendar date with no time or zone ("2026-11-04"), as used for invoice, bill, journal
 * and due dates. Business dates are Asia/Dhaka dates; timestamps are stored in UTC.
 */
export type BusinessDate = Brand<string, 'BusinessDate'>;

const ISO_DATE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
const DAY_MS = 86_400_000;

export const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface DateParts {
  readonly year: number;
  readonly month: number; // 1–12
  readonly day: number; // 1–31
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function fromUtcMs(ms: number): BusinessDate {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}` as BusinessDate;
}

function toUtcMs(date: BusinessDate): number {
  const { year, month, day } = dateParts(date);
  return Date.UTC(year, month - 1, day);
}

/** Parse "YYYY-MM-DD", rejecting impossible dates such as 2026-02-30. Years 1900–9999. */
export function parseBusinessDate(text: string): Result<BusinessDate> {
  const match = ISO_DATE.exec(text);
  if (!match) return invalid(`Not a YYYY-MM-DD date: "${text}"`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900) return invalid(`Year out of range: "${text}"`);
  const ms = Date.UTC(year, month - 1, day);
  // Date.UTC rolls 2026-02-30 over to 2026-03-02; a round trip catches it.
  if (fromUtcMs(ms) !== text) return invalid(`No such date: "${text}"`);
  return ok(text as BusinessDate);
}

/** Build a date from parts; throws on an impossible date (for trusted code and tests). */
export function businessDate(year: number, month: number, day: number): BusinessDate {
  const text = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  const result = parseBusinessDate(text);
  if (!result.ok) throw new DomainError('VALIDATION', result.error.message);
  return result.value;
}

export function dateParts(date: BusinessDate): DateParts {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

export function addDays(date: BusinessDate, days: number): BusinessDate {
  if (!Number.isInteger(days)) throw new DomainError('VALIDATION', 'addDays needs a whole number');
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Same day of month n months later, clamped to the month's last day (31 Jan + 1 → 28/29 Feb). */
export function addMonths(date: BusinessDate, months: number): BusinessDate {
  if (!Number.isInteger(months))
    throw new DomainError('VALIDATION', 'addMonths needs a whole number');
  const { year, month, day } = dateParts(date);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return businessDate(targetYear, targetMonth, Math.min(day, lastDay));
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: BusinessDate, b: BusinessDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

export function compareDates(a: BusinessDate, b: BusinessDate): -1 | 0 | 1 {
  if (a === b) return 0;
  return a < b ? -1 : 1; // ISO strings sort chronologically
}

/** "Jan" … "Dec" for month 1–12. */
export function monthAbbreviation(month: number): string {
  const name = Number.isInteger(month) ? MONTH_ABBREVIATIONS.at(month - 1) : undefined;
  if (name === undefined || month < 1) {
    throw new DomainError('VALIDATION', `Month must be 1–12, got ${String(month)}`);
  }
  return name;
}

/** "04 Nov 2026": the display format everywhere in the product (UX-07). */
export function formatDate(date: BusinessDate): string {
  const { year, month, day } = dateParts(date);
  return `${pad(day, 2)} ${monthAbbreviation(month)} ${String(year)}`;
}
