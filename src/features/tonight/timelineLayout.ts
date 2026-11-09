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

export const SPLIT_GAP = 3 * HOUR;
export const SPLIT_PADDING = 20 * MINUTE;
export const BREAK_WIDTH = 14;

export type TimelineAxis = { segments: Interval[] };

export function timelineAxis(range: Interval, passes: TimelinePass[]): TimelineAxis {
  const sorted = [...passes].sort((a, b) => a.startAt - b.startAt);
  let gap: Interval | null = null;
  let coveredUntil = sorted[0]?.endAt ?? range.from;
  for (const pass of sorted.slice(1)) {
    if (pass.startAt - coveredUntil > (gap ? gap.to - gap.from : 0)) {
      gap = { from: coveredUntil, to: pass.startAt };
    }
    coveredUntil = Math.max(coveredUntil, pass.endAt);
  }
  if (!gap || gap.to - gap.from < SPLIT_GAP) {
    return { segments: [range] };
  }
  return {
    segments: [
      { from: range.from, to: gap.from + SPLIT_PADDING },
      { from: gap.to - SPLIT_PADDING, to: range.to },
    ],
  };
}

export function axisScale(axis: TimelineAxis, width: number): number {
  'worklet';
  let total = 0;
  for (let index = 0; index < axis.segments.length; index += 1) {
    total += axis.segments[index]!.to - axis.segments[index]!.from;
  }
  const usable = width - BREAK_WIDTH * (axis.segments.length - 1);
  return total > 0 && usable > 0 ? usable / total : 0;
}

export function xOfTime(time: number, axis: TimelineAxis, width: number): number {
  'worklet';
  const scale = axisScale(axis, width);
  let left = 0;
  for (let index = 0; index < axis.segments.length; index += 1) {
    const segment = axis.segments[index]!;
    if (time < segment.from) {
      return index === 0 ? 0 : left - BREAK_WIDTH / 2;
    }
    if (time <= segment.to) {
      return left + (time - segment.from) * scale;
    }
    left += (segment.to - segment.from) * scale + BREAK_WIDTH;
  }
  return width;
}

export function timeAtX(x: number, axis: TimelineAxis, width: number): number {
  'worklet';
  const scale = axisScale(axis, width);
  let left = 0;
  for (let index = 0; index < axis.segments.length; index += 1) {
    const segment = axis.segments[index]!;
    const right = left + (segment.to - segment.from) * scale;
    if (x < left) {
      const previous = axis.segments[index - 1];
      return previous && x - (left - BREAK_WIDTH) < BREAK_WIDTH / 2 ? previous.to : segment.from;
    }
    if (x <= right) {
      return scale > 0 ? segment.from + (x - left) / scale : segment.from;
    }
    left = right + BREAK_WIDTH;
  }
  return axis.segments[axis.segments.length - 1]?.to ?? 0;
}

export const MIN_HOUR_SPACING = 48;
const HOUR_STEPS = [1, 2, 3, 6];

export function hourStep(axis: TimelineAxis, width: number): number {
  const pointsPerHour = axisScale(axis, width) * HOUR;
  return HOUR_STEPS.find((step) => step * pointsPerHour >= MIN_HOUR_SPACING) ?? 6;
}
