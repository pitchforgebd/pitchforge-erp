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
