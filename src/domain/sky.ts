import type { TrackPoint } from './types';

export type SkyPosition = {
  azimuth: number;
  elevation: number;
};

type Unit = { east: number; north: number; up: number };

const DEG = Math.PI / 180;

function toUnit({ azimuth, elevation }: SkyPosition): Unit {
  'worklet';
  const cosElevation = Math.cos(elevation * DEG);
  return {
    east: cosElevation * Math.sin(azimuth * DEG),
    north: cosElevation * Math.cos(azimuth * DEG),
    up: Math.sin(elevation * DEG),
  };
}

function fromUnit({ east, north, up }: Unit): SkyPosition {
  'worklet';
  const horizontal = Math.sqrt(east * east + north * north);
  const azimuth = Math.atan2(east, north) / DEG;
  return {
    azimuth: azimuth < 0 ? azimuth + 360 : azimuth,
    elevation: Math.atan2(up, horizontal) / DEG,
  };
}

export function angularSeparation(a: SkyPosition, b: SkyPosition): number {
  'worklet';
  const halfElevation = ((b.elevation - a.elevation) * DEG) / 2;
  const halfAzimuth = ((b.azimuth - a.azimuth) * DEG) / 2;
  const haversine =
    Math.sin(halfElevation) ** 2 +
    Math.cos(a.elevation * DEG) * Math.cos(b.elevation * DEG) * Math.sin(halfAzimuth) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(haversine)))) / DEG;
}

export function positionOnTrack(track: TrackPoint[], time: number): SkyPosition | null {
  'worklet';
  const first = track[0];
  const last = track[track.length - 1];
  if (!first || !last || time < first.time || time > last.time) {
    return null;
  }

  let low = 0;
  let high = track.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (track[middle]!.time <= time) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const before = track[low]!;
  const after = track[high]!;
  if (after.time === before.time) {
    return { azimuth: before.azimuth, elevation: before.elevation };
  }

  const fraction = (time - before.time) / (after.time - before.time);
  const a = toUnit(before);
  const b = toUnit(after);
  return fromUnit({
    east: a.east + (b.east - a.east) * fraction,
    north: a.north + (b.north - a.north) * fraction,
    up: a.up + (b.up - a.up) * fraction,
  });
}

export function aimError(pointing: SkyPosition, track: TrackPoint[], time: number): number | null {
  'worklet';
  const target = positionOnTrack(track, time);
  return target ? angularSeparation(pointing, target) : null;
}
