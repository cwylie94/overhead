import type { Vector } from './pointing';

const DEG = Math.PI / 180;
const MIN_HORIZONTAL = Math.sin(3 * DEG);

function cross(a: Vector, b: Vector): Vector {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function length({ x, y, z }: Vector): number {
  return Math.sqrt(x * x + y * y + z * z);
}

export function cameraAzimuth(gravity: Vector, magnetic: Vector): number | null {
  const gravityLength = length(gravity);
  if (gravityLength === 0) {
    return null;
  }
  const up = {
    x: -gravity.x / gravityLength,
    y: -gravity.y / gravityLength,
    z: -gravity.z / gravityLength,
  };
  const east = cross(magnetic, up);
  const eastLength = length(east);
  if (eastLength === 0 || Math.sqrt(1 - up.z * up.z) < MIN_HORIZONTAL) {
    return null;
  }
  const north = cross(up, east);
  const azimuth = Math.atan2(-east.z / eastLength, -north.z / eastLength) / DEG;
  return (azimuth + 360) % 360;
}
