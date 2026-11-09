import { cameraAzimuth } from '../cameraHeading';
import type { Vector } from '../pointing';

const G = 9.81;
const EARTH_FIELD = { east: 0, north: 19, up: -45 };
const DEG = Math.PI / 180;

type World = [number, number, number];

function dot(a: World, b: World): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: World, b: World): World {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function readings(azimuth: number, elevation: number, roll = 0) {
  const a = azimuth * DEG;
  const e = elevation * DEG;
  const r = roll * DEG;
  const camera: World = [Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), Math.sin(e)];
  const top: World = [-Math.sin(a) * Math.sin(e), -Math.cos(a) * Math.sin(e), Math.cos(e)];
  const side = cross(top, camera);
  const y: World = [0, 1, 2].map((i) => top[i] * Math.cos(r) + side[i] * Math.sin(r)) as World;
  const z: World = [-camera[0], -camera[1], -camera[2]];
  const x = cross(y, z);
  const inDevice = (v: World): Vector => ({ x: dot(v, x), y: dot(v, y), z: dot(v, z) });
  return {
    gravity: inDevice([0, 0, -G]),
    magnetic: inDevice([EARTH_FIELD.east, EARTH_FIELD.north, EARTH_FIELD.up]),
  };
}

function angleBetween(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

describe('cameraAzimuth', () => {
  test.each([
    [0, 0],
    [90, 10],
    [180, 46],
    [225, 30],
    [300, 75],
    [45, -20],
  ])('finds where the back camera points at %d° azimuth, %d° up', (azimuth, elevation) => {
    const { gravity, magnetic } = readings(azimuth, elevation);

    expect(angleBetween(cameraAzimuth(gravity, magnetic)!, azimuth)).toBeLessThan(1e-6);
  });

  test('follows the camera, not the top of the phone, when tilted back', () => {
    const { gravity, magnetic } = readings(180, 46);

    expect(angleBetween(cameraAzimuth(gravity, magnetic)!, 0)).toBeGreaterThan(170);
  });

  test('ignores how the phone is rolled around the camera', () => {
    const { gravity, magnetic } = readings(120, 35, 70);

    expect(angleBetween(cameraAzimuth(gravity, magnetic)!, 120)).toBeLessThan(1e-6);
  });

  test('has no azimuth with the camera at the zenith', () => {
    const { gravity, magnetic } = readings(0, 89);

    expect(cameraAzimuth(gravity, magnetic)).toBeNull();
  });

  test('has no azimuth without readings', () => {
    const none = { x: 0, y: 0, z: 0 };

    expect(cameraAzimuth(none, readings(0, 0).magnetic)).toBeNull();
    expect(cameraAzimuth(readings(0, 0).gravity, none)).toBeNull();
  });
});
