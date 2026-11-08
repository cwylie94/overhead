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
  return {
    startAt: first.startAt,
    endAt: last.endAt,
    appears: compassPoint(start.azimuth),
    disappears: compassPoint(end.azimuth),
  };
}
