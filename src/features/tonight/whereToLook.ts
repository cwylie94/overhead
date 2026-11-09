import { catchWindow } from '@/domain/catchWindow';
import { compassPoint, type CompassPoint } from '@/domain/compass';
import { positionOnTrack, type SkyPosition } from '@/domain/sky';
import type { TrackPoint } from '@/domain/types';

export type SkyHeight = 'horizon' | 'low' | 'halfway' | 'high' | 'overhead';
export type LookStage = 'upcoming' | 'live' | 'over';

export type LookGuide = {
  stage: LookStage;
  position: SkyPosition;
  direction: CompassPoint;
  height: SkyHeight;
  toward: CompassPoint | null;
};

type LookPass = { track: TrackPoint[]; startAt: number; endAt: number };

const HEIGHT_BANDS: readonly (readonly [number, SkyHeight])[] = [
  [15, 'horizon'],
  [35, 'low'],
  [60, 'halfway'],
  [80, 'high'],
];

export function skyHeight(elevation: number): SkyHeight {
  return HEIGHT_BANDS.find(([below]) => elevation < below)?.[1] ?? 'overhead';
}

export function lookStage(pass: LookPass, now: number): LookStage {
  const window = catchWindow(pass, now);
  return window === 'live' || window === 'over' ? window : 'upcoming';
}

const STAGE_TIME: Readonly<Record<LookStage, (pass: LookPass, now: number) => number>> = {
  upcoming: (pass) => pass.startAt,
  live: (_, now) => now,
  over: (pass) => pass.endAt,
};

export function whereToLook(pass: LookPass, now: number): LookGuide | null {
  const stage = lookStage(pass, now);
  const position = positionOnTrack(pass.track, STAGE_TIME[stage](pass, now));
  const end = positionOnTrack(pass.track, pass.endAt);
  if (!position || !end) {
    return null;
  }
  const direction = compassPoint(position.azimuth);
  const heading = compassPoint(end.azimuth);
  return {
    stage,
    position,
    direction,
    height: skyHeight(position.elevation),
    toward: stage === 'over' || heading === direction ? null : heading,
  };
}
