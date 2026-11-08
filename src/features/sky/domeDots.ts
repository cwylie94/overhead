import type { SkyPass } from '@/data/queries';
import { positionOnTrack } from '@/domain/sky';

import { projectToDome, type DomeLayout, type DomePoint } from './projection';

export type DomeDot = DomePoint & { noradId: number };

export function activeDots(
  passes: SkyPass[],
  time: number,
  layout: DomeLayout,
  rotation: number,
): DomeDot[] {
  'worklet';
  const dots: DomeDot[] = [];
  for (const pass of passes) {
    if (time >= pass.startAt && time <= pass.endAt) {
      const position = positionOnTrack(pass.track, time);
      const point = position && projectToDome(position, layout, rotation);
      if (point) {
        dots.push({ noradId: pass.noradId, x: point.x, y: point.y });
      }
    }
  }
  return dots;
}

export function nearestDot(dots: DomeDot[], point: DomePoint, maxDistance: number): number | null {
  'worklet';
  let best: number | null = null;
  let bestDistance = maxDistance;
  for (const dot of dots) {
    const distance = Math.hypot(dot.x - point.x, dot.y - point.y);
    if (distance <= bestDistance) {
      best = dot.noradId;
      bestDistance = distance;
    }
  }
  return best;
}
