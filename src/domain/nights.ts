const HOUR = 60 * 60 * 1_000;
const NIGHT_STARTS_AT_NOON = 12 * HOUR;
const DAY = 24 * HOUR;

export type NightKey = string;

export function nightOf(time: number): NightKey {
  const shifted = new Date(time - NIGHT_STARTS_AT_NOON);
  const month = String(shifted.getMonth() + 1).padStart(2, '0');
  const day = String(shifted.getDate()).padStart(2, '0');
  return `${shifted.getFullYear()}-${month}-${day}`;
}

export function nightNoon(night: NightKey): number {
  const [year, month, day] = night.split('-').map(Number);
  return new Date(year!, month! - 1, day!, 12).getTime();
}

export type NightLabel =
  { kind: 'tonight' } | { kind: 'tomorrow' } | { kind: 'later'; date: number };

export function nightLabel(night: NightKey, now: number): NightLabel {
  if (night === nightOf(now)) {
    return { kind: 'tonight' };
  }
  if (night === nightOf(now + DAY)) {
    return { kind: 'tomorrow' };
  }
  const [year, month, day] = night.split('-').map(Number);
  return { kind: 'later', date: new Date(year!, month! - 1, day!, 18).getTime() };
}

export type NightGroup<T> = { night: NightKey; label: NightLabel; data: T[] };

function labelAnchor(items: { startAt: number }[], now: number): number {
  const currentNight = nightOf(now);
  const morning = new Date(now).getHours() < 12;
  const nightIsOver = !items.some((item) => nightOf(item.startAt) === currentNight);
  return morning && nightIsOver ? now + NIGHT_STARTS_AT_NOON : now;
}

export function groupByNight<T extends { startAt: number }>(
  items: T[],
  now: number,
): NightGroup<T>[] {
  const anchor = labelAnchor(items, now);
  const groups: NightGroup<T>[] = [];
  for (const item of items) {
    const night = nightOf(item.startAt);
    const last = groups[groups.length - 1];
    if (last && last.night === night) {
      last.data.push(item);
    } else {
      groups.push({ night, label: nightLabel(night, anchor), data: [item] });
    }
  }
  return groups;
}
