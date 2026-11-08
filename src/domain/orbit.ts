import { json2satrec, propagate, type SatRec } from 'satellite.js';

import type { Vector3 } from './geometry';
import type { OmmRecord } from './types';

export type Orbit = {
  noradId: number;
  satrec: SatRec;
  inclination: number;
  meanMotion: number;
};

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
    meanMotion: omm.MEAN_MOTION,
  };
}

export function positionAt(orbit: Orbit, time: number): Vector3 | null {
  return propagate(orbit.satrec, new Date(time))?.position ?? null;
}
