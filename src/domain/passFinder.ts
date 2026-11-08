import type { GeodeticLocation } from 'satellite.js';

import { DEG, EARTH_RADIUS_KM } from './geometry';
import { lookAnglesFromEci, toGeodetic, type Observer } from './observer';
import { positionAt, type Orbit } from './orbit';
import { isSunlit, sunLookAngles, sunPositionEci } from './sun';
import type { TrackPoint } from './types';

export const DEFAULT_SUN_DARK_BELOW = -6;
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const SCAN_STEP = MINUTE;
const SCAN_MARGIN = 30 * MINUTE;
const TRACK_STEP = 10 * SECOND;
const PRECISION = 250;
const PEAK_PRECISION = 20;
export const MIN_VISIBLE_DURATION = 2 * TRACK_STEP;
const BELOW_EVERYTHING = -90;

export type PassSearch = {
  observer: Observer;
  from: number;
  to: number;
  minElevation: number;
  sunDarkBelow?: number;
};

export type VisibleInterval = { startAt: number; endAt: number };

export type FoundPass = {
  noradId: number;
  riseAt: number;
  peakAt: number;
  setAt: number;
  maxElevation: number;
  visible: VisibleInterval[];
  track: TrackPoint[];
};

type Context = {
  orbit: Orbit;
  observer: GeodeticLocation;
  minElevation: number;
  sunDarkBelow: number;
};

function elevationAt({ orbit, observer }: Context, time: number): number {
  const position = positionAt(orbit, time);
  return position ? lookAnglesFromEci(position, observer, time).elevation : BELOW_EVERYTHING;
}

function isVisibleAt(context: Context, time: number): boolean {
  const position = positionAt(context.orbit, time);
  if (!position) {
    return false;
  }
  return (
    lookAnglesFromEci(position, context.observer, time).elevation >= context.minElevation &&
    sunLookAngles(context.observer, time).elevation < context.sunDarkBelow &&
    isSunlit(position, sunPositionEci(time))
  );
}

function bisect(predicate: (time: number) => boolean, falseAt: number, trueAt: number): number {
  let outside = falseAt;
  let inside = trueAt;
  while (Math.abs(inside - outside) > PRECISION) {
    const middle = (outside + inside) / 2;
    if (predicate(middle)) {
      inside = middle;
    } else {
      outside = middle;
    }
  }
  return Math.round((outside + inside) / 2);
}

function refinePeak(context: Context, start: number, end: number): number {
  const ratio = (Math.sqrt(5) - 1) / 2;
  let low = start;
  let high = end;
  while (high - low > PEAK_PRECISION) {
    const left = high - ratio * (high - low);
    const right = low + ratio * (high - low);
    if (elevationAt(context, left) < elevationAt(context, right)) {
      low = left;
    } else {
      high = right;
    }
  }
  return Math.round((low + high) / 2);
}

function findCrossing(context: Context, peakAt: number, direction: -1 | 1): number {
  const isUp = (time: number) => elevationAt(context, time) >= context.minElevation;
  let inside = peakAt;
  let outside = peakAt + direction * SCAN_STEP;
  while (isUp(outside)) {
    inside = outside;
    outside += direction * SCAN_STEP;
  }
  return bisect(isUp, outside, inside);
}

function buildTrack(context: Context, riseAt: number, setAt: number): TrackPoint[] {
  const track: TrackPoint[] = [];
  for (let time = riseAt; time < setAt; time += TRACK_STEP) {
    track.push(trackPoint(context, time));
  }
  track.push(trackPoint(context, setAt));
  return track;
}

function trackPoint(context: Context, time: number): TrackPoint {
  const position = positionAt(context.orbit, time);
  const angles = position
    ? lookAnglesFromEci(position, context.observer, time)
    : { azimuth: 0, elevation: BELOW_EVERYTHING };
  return { time, azimuth: angles.azimuth, elevation: angles.elevation };
}

function findVisibleIntervals(context: Context, track: TrackPoint[]): VisibleInterval[] {
  const visible = (time: number) => isVisibleAt(context, time);
  const intervals: VisibleInterval[] = [];
  let startAt: number | null = null;

  for (let index = 0; index < track.length; index++) {
    const time = track[index]!.time;
    const isVisible = visible(time);
    const previous = index > 0 ? track[index - 1]!.time : null;

    if (isVisible && startAt === null) {
      startAt = previous === null ? time : bisect(visible, previous, time);
    } else if (!isVisible && startAt !== null) {
      intervals.push({ startAt, endAt: bisect(visible, time, previous!) });
      startAt = null;
    }
  }
  if (startAt !== null) {
    intervals.push({ startAt, endAt: track[track.length - 1]!.time });
  }
  return intervals.filter(({ startAt, endAt }) => endAt - startAt >= MIN_VISIBLE_DURATION);
}

export function canReachObserver(orbit: Orbit, observer: Observer, minElevation: number): boolean {
  const ratio = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + orbit.apogeeKm);
  const footprint = Math.acos(ratio * Math.cos(minElevation * DEG)) / DEG - minElevation;
  const reach = Math.min(orbit.inclination, 180 - orbit.inclination) + footprint;
  return Math.abs(observer.latitude) <= reach;
}

export function findPasses(orbit: Orbit, search: PassSearch): FoundPass[] {
  if (!canReachObserver(orbit, search.observer, search.minElevation)) {
    return [];
  }

  const context: Context = {
    orbit,
    observer: toGeodetic(search.observer),
    minElevation: search.minElevation,
    sunDarkBelow: search.sunDarkBelow ?? DEFAULT_SUN_DARK_BELOW,
  };

  const passes: FoundPass[] = [];
  const scanStart = search.from - SCAN_MARGIN;
  const scanEnd = search.to + SCAN_MARGIN;
  let before = elevationAt(context, scanStart - SCAN_STEP);
  let current = elevationAt(context, scanStart);

  for (let time = scanStart; time <= scanEnd; time += SCAN_STEP) {
    const after = elevationAt(context, time + SCAN_STEP);
    if (current > before && current >= after) {
      const peakAt = refinePeak(context, time - SCAN_STEP, time + SCAN_STEP);
      const maxElevation = elevationAt(context, peakAt);
      if (maxElevation >= search.minElevation) {
        const riseAt = findCrossing(context, peakAt, -1);
        const setAt = findCrossing(context, peakAt, 1);
        if (setAt > search.from && riseAt < search.to) {
          const track = buildTrack(context, riseAt, setAt);
          passes.push({
            noradId: orbit.noradId,
            riseAt,
            peakAt,
            setAt,
            maxElevation,
            visible: findVisibleIntervals(context, track),
            track,
          });
        }
      }
    }
    before = current;
    current = after;
  }
  return passes;
}
