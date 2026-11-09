import { Skia, type SkPath } from '@shopify/react-native-skia';

import type { SkyPass } from '@/data/queries';
import { projectToDome, type DomeLayout } from '@/ui/domeProjection';

import type { DomeDot } from './domeDots';

export const PATH_LOOKBACK = 2 * 60_000;
export const PATH_LOOKAHEAD = 20 * 60_000;

export function pathsNear(
  passes: SkyPass[],
  time: number,
  layout: DomeLayout,
  rotation: number,
): SkPath {
  'worklet';
  const path = Skia.PathBuilder.Make();
  for (const pass of passes) {
    if (pass.endAt < time - PATH_LOOKBACK || pass.startAt > time + PATH_LOOKAHEAD) {
      continue;
    }
    let drawing = false;
    for (const point of pass.track) {
      if (point.time < pass.startAt || point.time > pass.endAt) {
        continue;
      }
      const projected = projectToDome(point, layout, rotation);
      if (!projected) {
        drawing = false;
        continue;
      }
      if (drawing) {
        path.lineTo(projected.x, projected.y);
      } else {
        path.moveTo(projected.x, projected.y);
        drawing = true;
      }
    }
  }
  return path.build();
}

export function dotsPath(dots: DomeDot[], radius: number): SkPath {
  'worklet';
  const path = Skia.PathBuilder.Make();
  for (const dot of dots) {
    path.addCircle(dot.x, dot.y, radius);
  }
  return path.build();
}
