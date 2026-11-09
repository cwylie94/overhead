import type { UnitSystem } from '@/domain/types';

const KILOMETRES_PER_MILE = 1.609344;
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const formatterCache = new Map<
  string,
  Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat
>();

function cached<T extends Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat>(
  key: string,
  create: () => T,
): T {
  const existing = formatterCache.get(key);
  if (existing) {
    return existing as T;
  }
  const formatter = create();
  formatterCache.set(key, formatter);
  return formatter;
}

export function formatPassTime(time: number, language: string, timeZone?: string): string {
  const formatter = cached(
    `time:${language}:${timeZone ?? ''}`,
    () => new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit', timeZone }),
  );
  return formatter.format(time);
}

export function formatHour(time: number, language: string, timeZone?: string): string {
  const formatter = cached(
    `hour:${language}:${timeZone ?? ''}`,
    () => new Intl.DateTimeFormat(language, { hour: 'numeric', timeZone }),
  );
  return formatter.format(time);
}

export function formatCountdown(target: number, now: number, language: string): string {
  const formatter = cached(
    `relative:${language}`,
    () => new Intl.RelativeTimeFormat(language, { numeric: 'auto' }),
  );
  const delta = target - now;
  const magnitude = Math.abs(delta);

  if (magnitude < MINUTE) {
    return formatter.format(Math.round(delta / SECOND), 'second');
  }
  if (magnitude < HOUR) {
    return formatter.format(Math.round(delta / MINUTE), 'minute');
  }
  if (magnitude < DAY) {
    return formatter.format(Math.round(delta / HOUR), 'hour');
  }
  return formatter.format(Math.round(delta / DAY), 'day');
}

export function formatDistance(kilometres: number, units: UnitSystem, language: string): string {
  const unit = units === 'imperial' ? 'mile' : 'kilometer';
  const value = units === 'imperial' ? kilometres / KILOMETRES_PER_MILE : kilometres;
  const formatter = cached(
    `distance:${language}:${unit}`,
    () => new Intl.NumberFormat(language, { style: 'unit', unit, maximumFractionDigits: 0 }),
  );
  return formatter.format(value);
}

export function formatNightDate(time: number, language: string): string {
  const formatter = cached(
    `night:${language}`,
    () => new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long' }),
  );
  return formatter.format(time);
}

export function formatShortDate(time: number, language: string): string {
  const formatter = cached(
    `short:${language}`,
    () => new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }),
  );
  return formatter.format(time);
}

export function formatCalendarDate(date: string | number, language: string): string {
  const time =
    typeof date === 'number' ? date : new Date(`${date.slice(0, 10)}T12:00:00`).getTime();
  const formatter = cached(
    `calendar:${language}`,
    () => new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', year: 'numeric' }),
  );
  return formatter.format(time);
}
