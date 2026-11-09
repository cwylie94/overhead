import type { Interval, NightSky } from './nightSky';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const MARGIN = 20 * MINUTE;

export type TimelinePass = { id: number; startAt: number; endAt: number };

export function timelineRange(sky: NightSky | null, passes: TimelinePass[]): Interval | null {
  const first = passes[0];
  const last = passes[passes.length - 1];
  if (!first || !last) {
    return null;
  }
  const lastEnd = Math.max(...passes.map((pass) => pass.endAt));
  return {
    from: Math.min(sky?.sunset ?? first.startAt - MARGIN, first.startAt - MARGIN),
    to: Math.max(sky?.sunrise ?? lastEnd + MARGIN, lastEnd + MARGIN),
  };
}

export function fractionOf(time: number, range: Interval): number {
  return Math.min(1, Math.max(0, (time - range.from) / (range.to - range.from)));
}

export function clip(interval: Interval, range: Interval): Interval | null {
  const from = Math.max(interval.from, range.from);
  const to = Math.min(interval.to, range.to);
  return to > from ? { from, to } : null;
}

export function hourMarks(range: Interval, every = 3): number[] {
  const marks: number[] = [];
  const start = new Date(range.from);
  start.setMinutes(0, 0, 0);
  for (let time = start.getTime() + HOUR; time < range.to; time += HOUR) {
    if (new Date(time).getHours() % every === 0) {
      marks.push(time);
    }
  }
  return marks;
}

export function nearestPass<T extends TimelinePass>(
  passes: T[],
  time: number,
  tolerance: number,
): T | null {
  let nearest: T | null = null;
  let distance = tolerance;
  for (const pass of passes) {
    const gap =
      time < pass.startAt ? pass.startAt - time : time > pass.endAt ? time - pass.endAt : 0;
    if (gap <= distance) {
      nearest = pass;
      distance = gap;
    }
  }
  return nearest;
}
