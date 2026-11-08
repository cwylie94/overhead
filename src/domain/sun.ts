import type { GeodeticLocation } from 'satellite.js';

import { DEG, dot, EARTH_RADIUS_KM, julianDay, length, subtract, type Vector3 } from './geometry';
import { lookAnglesFromEci, type LookAngles } from './observer';

const AU_KM = 149_597_870.7;
const J2000 = 2_451_545.0;

export function sunPositionEci(time: number): Vector3 {
  const n = julianDay(time) - J2000;
  const meanLongitude = 280.46 + 0.9856474 * n;
  const meanAnomaly = (357.528 + 0.9856003 * n) * DEG;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG;
  const obliquity = (23.439 - 0.0000004 * n) * DEG;
  const distance =
    (1.00014 - 0.01671 * Math.cos(meanAnomaly) - 0.00014 * Math.cos(2 * meanAnomaly)) * AU_KM;

  return {
    x: distance * Math.cos(eclipticLongitude),
    y: distance * Math.cos(obliquity) * Math.sin(eclipticLongitude),
    z: distance * Math.sin(obliquity) * Math.sin(eclipticLongitude),
  };
}

export function sunLookAngles(observer: GeodeticLocation, time: number): LookAngles {
  return lookAnglesFromEci(sunPositionEci(time), observer, time);
}

export function isSunlit(satellite: Vector3, sun: Vector3): boolean {
  const toSun = subtract(sun, satellite);
  const distanceToSun = length(toSun);
  const direction = {
    x: toSun.x / distanceToSun,
    y: toSun.y / distanceToSun,
    z: toSun.z / distanceToSun,
  };
  const alongRay = -dot(satellite, direction);

  if (alongRay <= 0) {
    return true;
  }
  const closest = {
    x: satellite.x + alongRay * direction.x,
    y: satellite.y + alongRay * direction.y,
    z: satellite.z + alongRay * direction.z,
  };
  return length(closest) > EARTH_RADIUS_KM;
}
