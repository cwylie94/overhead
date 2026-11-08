import type { SkyPosition } from '@/domain/sky';

export type DomeLayout = {
  centerX: number;
  centerY: number;
  radius: number;
};

export type DomePoint = { x: number; y: number };

const DEG = Math.PI / 180;

export function projectToDome(
  { azimuth, elevation }: SkyPosition,
  layout: DomeLayout,
  rotation: number,
): DomePoint | null {
  'worklet';
  if (elevation < 0) {
    return null;
  }
  const distance = (layout.radius * (90 - elevation)) / 90;
  const angle = (azimuth - rotation) * DEG;
  return {
    x: layout.centerX - distance * Math.sin(angle),
    y: layout.centerY - distance * Math.cos(angle),
  };
}

export function domeToSky(
  point: DomePoint,
  layout: DomeLayout,
  rotation: number,
): SkyPosition | null {
  'worklet';
  const dx = layout.centerX - point.x;
  const dy = layout.centerY - point.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > layout.radius) {
    return null;
  }
  const azimuth = (Math.atan2(dx, dy) / DEG + rotation + 360) % 360;
  return { azimuth, elevation: 90 - (distance / layout.radius) * 90 };
}

export function unwrapHeading(previous: number, next: number): number {
  'worklet';
  const delta = ((((next - previous) % 360) + 540) % 360) - 180;
  return previous + delta;
}
