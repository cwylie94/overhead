import { ecfToEci, geodeticToEcf, gstime, type GeodeticLocation } from 'satellite.js';

import { DEG, dot, EARTH_RADIUS_KM, length, type Vector3 } from './geometry';
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
const REACH_MARGIN_DEGREES = 1;

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
  observerEcf: Vector3;
  minElevation: number;
  sunDarkBelow: number;
};

type ScanSample = { time: number; elevation: number; angleFromObserver: number };

function elevationAt({ orbit, observer }: Context, time: number): number {
  const position = positionAt(orbit, time);
  return position ? lookAnglesFromEci(position, observer, time).elevation : BELOW_EVERYTHING;
}

function scanSample(context: Context, time: number): ScanSample {
  const position = positionAt(context.orbit, time);
  if (!position) {
    return { time, elevation: BELOW_EVERYTHING, angleFromObserver: 180 };
  }
  const observerEci = ecfToEci(context.observerEcf, gstime(new Date(time)));
  const cosine = dot(position, observerEci) / (length(position) * length(observerEci));
  return {
    time,
    elevation: lookAnglesFromEci(position, context.observer, time).elevation,
    angleFromObserver: Math.acos(Math.min(1, Math.max(-1, cosine))) / DEG,
  };
}

function isVisibleAt(context: Context, time: number): boolean {
  if (sunLookAngles(context.observer, time).elevation >= context.sunDarkBelow) {
    return false;
  }
  const position = positionAt(context.orbit, time);
  return (
    position !== null &&
    lookAnglesFromEci(position, context.observer, time).elevation >= context.minElevation &&
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

export function footprintDegrees(altitudeKm: number, minElevation: number): number {
  const ratio = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm);
  return Math.acos(ratio * Math.cos(minElevation * DEG)) / DEG - minElevation;
}

export function canReachObserver(orbit: Orbit, observer: Observer, minElevation: number): boolean {
  const reach =
    Math.min(orbit.inclination, 180 - orbit.inclination) +
    footprintDegrees(orbit.apogeeKm, minElevation);
  return Math.abs(observer.latitude) <= reach;
}

function buildPass(context: Context, search: PassSearch, peakAt: number): FoundPass | null {
  const maxElevation = elevationAt(context, peakAt);
  if (maxElevation < context.minElevation) {
    return null;
  }
  const riseAt = findCrossing(context, peakAt, -1);
  const setAt = findCrossing(context, peakAt, 1);
  if (setAt <= search.from || riseAt >= search.to) {
    return null;
  }
  const track = buildTrack(context, riseAt, setAt);
  return {
    noradId: context.orbit.noradId,
    riseAt,
    peakAt,
    setAt,
    maxElevation,
    visible: findVisibleIntervals(context, track),
    track,
  };
}

function peaksIn(samples: ScanSample[]): number[] {
  const peaks: number[] = [];
  for (let index = 1; index < samples.length - 1; index++) {
    const { elevation } = samples[index]!;
    if (elevation > samples[index - 1]!.elevation && elevation >= samples[index + 1]!.elevation) {
      peaks.push(samples[index]!.time);
    }
  }
  return peaks;
}

export function findPasses(orbit: Orbit, search: PassSearch): FoundPass[] {
  if (!canReachObserver(orbit, search.observer, search.minElevation)) {
    return [];
  }

  const observer = toGeodetic(search.observer);
  const context: Context = {
    orbit,
    observer,
    observerEcf: geodeticToEcf(observer),
    minElevation: search.minElevation,
    sunDarkBelow: search.sunDarkBelow ?? DEFAULT_SUN_DARK_BELOW,
  };
  const reach = footprintDegrees(orbit.apogeeKm, search.minElevation) + REACH_MARGIN_DEGREES;
  const scanEnd = search.to + SCAN_MARGIN;
  const passes: FoundPass[] = [];
  let time = search.from - SCAN_MARGIN;

  while (time <= scanEnd) {
    const sample = scanSample(context, time);
    const slack = sample.angleFromObserver - reach;
    if (slack > 0) {
      time += Math.max(SCAN_STEP, slack / orbit.maxAngularRate);
      continue;
    }

    const samples = [scanSample(context, time - SCAN_STEP), sample];
    let last = sample;
    while (last.angleFromObserver <= reach && last.time <= scanEnd) {
      last = scanSample(context, last.time + SCAN_STEP);
      samples.push(last);
    }

    for (const coarsePeak of peaksIn(samples)) {
      const pass = buildPass(
        context,
        search,
        refinePeak(context, coarsePeak - SCAN_STEP, coarsePeak + SCAN_STEP),
      );
      if (pass) {
        passes.push(pass);
      }
    }
    time = last.time + SCAN_STEP;
  }
  return passes;
}
