export const TIMELINE_SPAN = 12 * 60 * 60 * 1_000;
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

export function offsetAtX(x: number, width: number): number {
  'worklet';
  return width > 0 ? clampOffset((x / width) * TIMELINE_SPAN) : 0;
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

const PERIOD_NOISE = /[\d\s\u200e\u202f:]/g;

export function clockStyleFor(language: string): ClockStyle {
  const evening = new Date(2000, 0, 1, 21);
  const hour12 = !new Intl.DateTimeFormat(language, { hour: 'numeric' })
    .format(evening)
    .includes('21');
  const twelveHour = new Intl.DateTimeFormat(language, { hour: 'numeric', hour12: true });
  const period = (date: Date) => twelveHour.format(date).replace(PERIOD_NOISE, '');
  return { hour12, am: period(new Date(2000, 0, 1, 9)), pm: period(evening) };
}
