import type { SkyPosition } from '@/domain/sky';

import type { Vector } from './pointing';

const DEG = Math.PI / 180;
const FULL_FRAME_DIAGONAL_MM = 43.267;
const PHOTO_ASPECT = 4 / 3;

export type CameraPose = SkyPosition & { roll: number };
export type CameraViewport = { width: number; height: number; focalPx: number };
export type CameraPoint = {
  x: number;
  y: number;
  inFront: boolean;
  onScreen: boolean;
  direction: number;
};

type Enu = { e: number; n: number; u: number };

function toEnu({ azimuth, elevation }: SkyPosition): Enu {
  'worklet';
  const cosElevation = Math.cos(elevation * DEG);
  return {
    e: Math.sin(azimuth * DEG) * cosElevation,
    n: Math.cos(azimuth * DEG) * cosElevation,
    u: Math.sin(elevation * DEG),
  };
}

function dot(a: Enu, b: Enu): number {
  'worklet';
  return a.e * b.e + a.n * b.n + a.u * b.u;
}

export function rollFromGravity({ x, y }: Vector): number {
  'worklet';
  return Math.atan2(x, -y) / DEG;
}

export function focalLengthPx(
  focalLength35mm: number,
  width: number,
  height: number,
  frameAspect = PHOTO_ASPECT,
): number {
  'worklet';
  const scale = Math.max(width, height / frameAspect);
  const diagonal = Math.sqrt(1 + frameAspect * frameAspect);
  return (scale * diagonal * focalLength35mm) / FULL_FRAME_DIAGONAL_MM;
}

function cameraAxes({ azimuth, elevation, roll }: CameraPose) {
  'worklet';
  const forward = toEnu({ azimuth, elevation });
  const level = { e: Math.cos(azimuth * DEG), n: -Math.sin(azimuth * DEG), u: 0 };
  const lift = {
    e: level.n * forward.u - level.u * forward.n,
    n: level.u * forward.e - level.e * forward.u,
    u: level.e * forward.n - level.n * forward.e,
  };
  const cosRoll = Math.cos(roll * DEG);
  const sinRoll = Math.sin(roll * DEG);
  const right = {
    e: level.e * cosRoll - lift.e * sinRoll,
    n: level.n * cosRoll - lift.n * sinRoll,
    u: level.u * cosRoll - lift.u * sinRoll,
  };
  const up = {
    e: lift.e * cosRoll + level.e * sinRoll,
    n: lift.n * cosRoll + level.n * sinRoll,
    u: lift.u * cosRoll + level.u * sinRoll,
  };
  return { forward, right, up };
}

export function projectToCamera(
  target: SkyPosition,
  pose: CameraPose,
  { width, height, focalPx }: CameraViewport,
): CameraPoint {
  'worklet';
  const { forward, right, up } = cameraAxes(pose);
  const direction = toEnu(target);
  const depth = dot(direction, forward);
  const across = dot(direction, right);
  const rise = dot(direction, up);
  const angle = Math.atan2(across, rise) / DEG;

  if (depth <= 1e-6) {
    return { x: Number.NaN, y: Number.NaN, inFront: false, onScreen: false, direction: angle };
  }
  const x = width / 2 + (focalPx * across) / depth;
  const y = height / 2 - (focalPx * rise) / depth;
  const onScreen = x >= 0 && x <= width && y >= 0 && y <= height;
  return { x, y, inFront: true, onScreen, direction: angle };
}

export function edgePoint(
  direction: number,
  { width, height }: Pick<CameraViewport, 'width' | 'height'>,
  inset: number,
): { x: number; y: number } {
  'worklet';
  const dx = Math.sin(direction * DEG);
  const dy = -Math.cos(direction * DEG);
  const halfWidth = width / 2 - inset;
  const halfHeight = height / 2 - inset;
  const reach = Math.min(
    Math.abs(dx) > 1e-9 ? halfWidth / Math.abs(dx) : Number.POSITIVE_INFINITY,
    Math.abs(dy) > 1e-9 ? halfHeight / Math.abs(dy) : Number.POSITIVE_INFINITY,
  );
  return { x: width / 2 + dx * reach, y: height / 2 + dy * reach };
}

export function trackSegments(
  track: readonly SkyPosition[],
  pose: CameraPose,
  viewport: CameraViewport,
): { x: number; y: number }[][] {
  'worklet';
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  for (const position of track) {
    const point = projectToCamera(position, pose, viewport);
    if (point.inFront) {
      current.push({ x: point.x, y: point.y });
    } else if (current.length > 0) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    segments.push(current);
  }
  return segments.filter((segment) => segment.length > 1);
}
