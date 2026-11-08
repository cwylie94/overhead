import type { SkyPosition } from '@/domain/sky';

export type Vector = { x: number; y: number; z: number };

const DEG = Math.PI / 180;

export function elevationFromGravity({ x, y, z }: Vector): number {
  'worklet';
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  if (magnitude === 0) {
    return 0;
  }
  return Math.asin(Math.max(-1, Math.min(1, -z / magnitude))) / DEG;
}

export function wrapDegrees(delta: number): number {
  'worklet';
  return ((((delta + 180) % 360) + 360) % 360) - 180;
}

export type SkyOffset = { right: number; up: number };

export function offsetToTarget(pointing: SkyPosition, target: SkyPosition): SkyOffset {
  'worklet';
  const horizontal = Math.cos(((pointing.elevation + target.elevation) / 2) * DEG);
  return {
    right: wrapDegrees(target.azimuth - pointing.azimuth) * horizontal,
    up: target.elevation - pointing.elevation,
  };
}

export function guideAngle({ right, up }: SkyOffset): number {
  'worklet';
  return Math.atan2(right, up) / DEG;
}

export function manualPointing(
  start: SkyPosition,
  dragX: number,
  dragY: number,
  pointsPerDegree: number,
): SkyPosition {
  'worklet';
  const azimuth = (((start.azimuth - dragX / pointsPerDegree) % 360) + 360) % 360;
  const elevation = Math.max(-10, Math.min(90, start.elevation + dragY / pointsPerDegree));
  return { azimuth, elevation };
}

export function pulseInterval(angleError: number | null): number | null {
  if (angleError === null || angleError > 40) {
    return null;
  }
  if (angleError <= 10) {
    return 120;
  }
  return Math.round(200 + ((angleError - 10) / 30) * 600);
}
