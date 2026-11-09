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

export function readings(azimuth: number, elevation: number, roll = 0) {
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
