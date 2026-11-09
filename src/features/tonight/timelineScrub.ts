import type { Interval } from './nightSky';

const MINUTE = 60_000;

export const LOUPE_SPAN = 45 * MINUTE;
export const LOUPE_LABEL_EVERY = 15 * MINUTE;

export function timeAtX(x: number, range: Interval, width: number): number {
  'worklet';
  const fraction = width > 0 ? Math.min(1, Math.max(0, x / width)) : 0;
  return range.from + fraction * (range.to - range.from);
}

export function nearestStart(starts: number[], time: number, reach: number): number {
  'worklet';
  let nearest = -1;
  let distance = reach;
  for (let index = 0; index < starts.length; index += 1) {
    const gap = Math.abs(starts[index]! - time);
    if (gap <= distance) {
      nearest = index;
      distance = gap;
    }
  }
  return nearest;
}

export function loupeLeft(fingerX: number, trackWidth: number, loupeWidth: number): number {
  'worklet';
  return Math.min(Math.max(fingerX - loupeWidth / 2, 0), Math.max(trackWidth - loupeWidth, 0));
}

export function loupeX(time: number, center: number, loupeWidth: number): number {
  'worklet';
  return ((time - center) / LOUPE_SPAN + 0.5) * loupeWidth;
}

export function loupeLabelTimes(range: Interval): number[] {
  const times: number[] = [];
  const first = Math.ceil((range.from - LOUPE_SPAN) / LOUPE_LABEL_EVERY) * LOUPE_LABEL_EVERY;
  for (let time = first; time <= range.to + LOUPE_SPAN; time += LOUPE_LABEL_EVERY) {
    times.push(time);
  }
  return times;
}
