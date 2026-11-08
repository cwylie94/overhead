import type { GeodeticLocation } from 'satellite.js';

import { DEG, EARTH_RADIUS_KM, julianDay, type Vector3 } from './geometry';
import { lookAnglesFromEci, type LookAngles } from './observer';

const J2000 = 2_451_545.0;
const DAYS_PER_CENTURY = 36_525;

function sinDeg(degrees: number): number {
  return Math.sin(degrees * DEG);
}

function cosDeg(degrees: number): number {
  return Math.cos(degrees * DEG);
}

export function moonPositionEci(time: number): Vector3 {
  const t = (julianDay(time) - J2000) / DAYS_PER_CENTURY;

  const longitude =
    218.32 +
    481_267.881 * t +
    6.29 * sinDeg(135.0 + 477_198.87 * t) -
    1.27 * sinDeg(259.3 - 413_335.36 * t) +
    0.66 * sinDeg(235.7 + 890_534.22 * t) +
    0.21 * sinDeg(269.9 + 954_397.74 * t) -
    0.19 * sinDeg(357.5 + 35_999.05 * t) -
    0.11 * sinDeg(186.5 + 966_404.03 * t);
  const latitude =
    5.13 * sinDeg(93.3 + 483_202.02 * t) +
    0.28 * sinDeg(228.2 + 960_400.89 * t) -
    0.28 * sinDeg(318.3 + 6_003.15 * t) -
    0.17 * sinDeg(217.6 - 407_332.21 * t);
  const parallax =
    0.9508 +
    0.0518 * cosDeg(135.0 + 477_198.87 * t) +
    0.0095 * cosDeg(259.3 - 413_335.36 * t) +
    0.0078 * cosDeg(235.7 + 890_534.22 * t) +
    0.0028 * cosDeg(269.9 + 954_397.74 * t);

  const distance = EARTH_RADIUS_KM / sinDeg(parallax);
  const obliquity = 23.439 - 0.013 * t;
  const x = cosDeg(latitude) * cosDeg(longitude);
  const y = cosDeg(latitude) * sinDeg(longitude);
  const z = sinDeg(latitude);

  return {
    x: distance * x,
    y: distance * (cosDeg(obliquity) * y - sinDeg(obliquity) * z),
    z: distance * (sinDeg(obliquity) * y + cosDeg(obliquity) * z),
  };
}

export function moonLookAngles(observer: GeodeticLocation, time: number): LookAngles {
  return lookAnglesFromEci(moonPositionEci(time), observer, time);
}
