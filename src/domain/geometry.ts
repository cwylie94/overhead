'worklet';

export type Vector3 = { x: number; y: number; z: number };

export const DEG = Math.PI / 180;
export const EARTH_RADIUS_KM = 6378.137;
export const MS_PER_DAY = 86_400_000;
const UNIX_EPOCH_JULIAN_DAY = 2_440_587.5;

export function julianDay(time: number): number {
  return time / MS_PER_DAY + UNIX_EPOCH_JULIAN_DAY;
}

export function subtract(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function length(v: Vector3): number {
  return Math.sqrt(dot(v, v));
}

export function normalizeDegrees(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function wrapDegrees(delta: number): number {
  'worklet';
  return ((((delta + 180) % 360) + 360) % 360) - 180;
}
