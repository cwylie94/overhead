'worklet';

import type { FoundPass } from './passFinder';
import { positionOnTrack } from './sky';

export const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type CompassPoint = (typeof COMPASS_POINTS)[number];

export function compassPoint(azimuth: number): CompassPoint {
  const wrapped = ((azimuth % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(wrapped / 45) % COMPASS_POINTS.length]!;
}

export type PassWindow = {
  startAt: number;
  endAt: number;
  peakAt: number;
  maxElevation: number;
  appears: CompassPoint;
  disappears: CompassPoint;
};

export function visibleWindow(pass: Pick<FoundPass, 'visible' | 'track'>): PassWindow | null {
  const first = pass.visible[0];
  const last = pass.visible[pass.visible.length - 1];
  if (!first || !last) {
    return null;
  }
  const start = positionOnTrack(pass.track, first.startAt);
  const end = positionOnTrack(pass.track, last.endAt);
  if (!start || !end) {
    return null;
  }

  const candidates = [
    { time: first.startAt, elevation: start.elevation },
    { time: last.endAt, elevation: end.elevation },
    ...pass.track.filter((point) => point.time > first.startAt && point.time < last.endAt),
  ];
  const peak = candidates.reduce((best, point) =>
    point.elevation > best.elevation ? point : best,
  );

  return {
    startAt: first.startAt,
    endAt: last.endAt,
    peakAt: peak.time,
    maxElevation: peak.elevation,
    appears: compassPoint(start.azimuth),
    disappears: compassPoint(end.azimuth),
  };
}
