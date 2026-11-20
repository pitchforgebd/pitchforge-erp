import { unwrap } from '../errors/result.ts';

import { formatDate, parseBusinessDate } from './business-date.ts';
import type { BusinessDate } from './business-date.ts';

/** All business dates and displayed times are in this zone; storage is UTC. */
export const BUSINESS_TIME_ZONE = 'Asia/Dhaka';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts
    .filter((p) => p.type === type)
    .map((p) => p.value)
    .join('');
}

/**
 * The Asia/Dhaka calendar date of an instant. Uses the time-zone database (not a fixed
 * +06:00) so a future change to Bangladesh time is picked up from the runtime.
 */
export function toBusinessDate(instant: Date): BusinessDate {
  const parts = dateFormatter.formatToParts(instant);
  return unwrap(
    parseBusinessDate(`${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`),
  );
}

/** Today's date in Dhaka. Pass `now` from an injected clock in domain code and tests. */
export function todayInDhaka(now: Date = new Date()): BusinessDate {
  return toBusinessDate(now);
}

/** "04 Nov 2026, 14:30" in Asia/Dhaka. */
export function formatDateTime(instant: Date): string {
  const parts = timeFormatter.formatToParts(instant);
  return `${formatDate(toBusinessDate(instant))}, ${part(parts, 'hour')}:${part(parts, 'minute')}`;
}

const wallClockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** The Dhaka wall-clock reading of an instant, as if it were UTC, in milliseconds. */
function wallClockMs(instant: Date): number {
  const parts = wallClockFormatter.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(part(parts, type));
  return Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'));
}

const TIME = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;

/**
 * The instant at a Dhaka date and "HH:MM", e.g. a tender deadline typed as 11:00 in Dhaka.
 * Undefined for a time that is not HH:MM. Uses the time-zone database, like the rest.
 */
export function fromDhakaWallClock(date: BusinessDate, time: string): Date | undefined {
  const match = TIME.exec(time);
  if (match === null) return undefined;
  // A BusinessDate is always YYYY-MM-DD.
  const guess = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    Number(match[1]),
    Number(match[2]),
  );
  return new Date(guess - (wallClockMs(new Date(guess)) - guess));
}

/** The Dhaka date and "HH:MM" of an instant, to show or edit it. */
export function toDhakaWallClock(instant: Date): {
  readonly date: BusinessDate;
  readonly time: string;
} {
  const parts = timeFormatter.formatToParts(instant);
  return { date: toBusinessDate(instant), time: `${part(parts, 'hour')}:${part(parts, 'minute')}` };
}
