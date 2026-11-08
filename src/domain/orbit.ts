import { json2satrec, propagate, type SatRec } from 'satellite.js';

import { EARTH_RADIUS_KM, type Vector3 } from './geometry';
import type { OmmRecord } from './types';

export type Orbit = {
  noradId: number;
  satrec: SatRec;
  inclination: number;
  apogeeKm: number;
  maxAngularRate: number;
};

const EARTH_GM_KM3_S2 = 398_600.4418;
const SECONDS_PER_DAY = 86_400;
const MS_PER_MINUTE = 60_000;
const EARTH_ROTATION_DEG_PER_MINUTE = 360 / 1436.0686;

export function maxAngularRateDegPerMinute(meanMotion: number, eccentricity: number): number {
  const meanRate = (meanMotion * 360) / 1440;
  const perigeeRate = (meanRate * (1 + eccentricity) ** 2) / (1 - eccentricity ** 2) ** 1.5;
  return perigeeRate + EARTH_ROTATION_DEG_PER_MINUTE;
}

function semiMajorAxisKm(meanMotion: number): number {
  const radiansPerSecond = (meanMotion * 2 * Math.PI) / SECONDS_PER_DAY;
  return Math.cbrt(EARTH_GM_KM3_S2 / radiansPerSecond ** 2);
}

export function apogeeAltitudeKm(meanMotion: number, eccentricity: number): number {
  return semiMajorAxisKm(meanMotion) * (1 + eccentricity) - EARTH_RADIUS_KM;
}

export function perigeeAltitudeKm(meanMotion: number, eccentricity: number): number {
  return semiMajorAxisKm(meanMotion) * (1 - eccentricity) - EARTH_RADIUS_KM;
}

export function periodMinutes(meanMotion: number): number {
  return 1440 / meanMotion;
}

export function orbitFromOmm(omm: OmmRecord): Orbit {
  if (omm.EPHEMERIS_TYPE !== 0) {
    throw new Error(
      `${omm.OBJECT_NAME} has ephemeris type ${omm.EPHEMERIS_TYPE}; only SGP4 (0) is supported`,
    );
  }
  return {
    noradId: omm.NORAD_CAT_ID,
    satrec: json2satrec({
      ...omm,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: omm.CLASSIFICATION_TYPE === 'C' ? 'C' : 'U',
    }),
    inclination: omm.INCLINATION,
    apogeeKm: apogeeAltitudeKm(omm.MEAN_MOTION, omm.ECCENTRICITY),
    maxAngularRate: maxAngularRateDegPerMinute(omm.MEAN_MOTION, omm.ECCENTRICITY) / MS_PER_MINUTE,
  };
}

export function positionAt(orbit: Orbit, time: number): Vector3 | null {
  return propagate(orbit.satrec, new Date(time))?.position ?? null;
}
