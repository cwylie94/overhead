export const TIMELINE_SPAN = 12 * 60 * 60 * 1_000;
export const MS_PER_POINT = 30_000;
const MINUTE = 60_000;

export type ClockStyle = {
  hour12: boolean;
  am: string;
  pm: string;
};

export function clampOffset(offset: number): number {
  'worklet';
  return Math.min(TIMELINE_SPAN, Math.max(0, offset));
}

export function offsetAfterDrag(start: number, translationX: number): number {
  'worklet';
  return clampOffset(start - translationX * MS_PER_POINT);
}

export function formatClock(time: number, style: ClockStyle): string {
  'worklet';
  const date = new Date(time);
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const hours = date.getHours();
  if (!style.hour12) {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour}:${minutes} ${hours < 12 ? style.am : style.pm}`;
}

export function formatOffset(offset: number): string {
  'worklet';
  const totalMinutes = Math.round(offset / MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalMinutes === 0) {
    return '';
  }
  return hours > 0 ? `+${hours}h ${String(minutes).padStart(2, '0')}m` : `+${minutes}m`;
}

export function clockStyleFor(language: string): ClockStyle {
  const formatter = new Intl.DateTimeFormat(language, { hour: 'numeric' });
  const hour12 = formatter.resolvedOptions().hour12 ?? false;
  const period = (hour: number) =>
    new Intl.DateTimeFormat(language, { hour: 'numeric', hour12: true })
      .formatToParts(new Date(2000, 0, 1, hour))
      .find((part) => part.type === 'dayPeriod')?.value ?? '';
  return { hour12, am: period(9), pm: period(21) };
}
