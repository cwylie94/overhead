import { json2satrec, propagate, type SatRec } from 'satellite.js';

import { EARTH_RADIUS_KM, type Vector3 } from './geometry';
import type { OmmRecord } from './types';

export type Orbit = {
  noradId: number;
  satrec: SatRec;
  inclination: number;
  apogeeKm: number;
};

const EARTH_GM_KM3_S2 = 398_600.4418;
const SECONDS_PER_DAY = 86_400;

export function apogeeAltitudeKm(meanMotion: number, eccentricity: number): number {
  const radiansPerSecond = (meanMotion * 2 * Math.PI) / SECONDS_PER_DAY;
  const semiMajorAxis = Math.cbrt(EARTH_GM_KM3_S2 / radiansPerSecond ** 2);
  return semiMajorAxis * (1 + eccentricity) - EARTH_RADIUS_KM;
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
  };
}

export function positionAt(orbit: Orbit, time: number): Vector3 | null {
  return propagate(orbit.satrec, new Date(time))?.position ?? null;
}
