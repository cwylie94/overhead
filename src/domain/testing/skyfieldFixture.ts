import stations from '@/data/snapshot/stations.json';
import visual from '@/data/snapshot/visual.json';

import fixture from '../__fixtures__/skyfield-london.json';
import type { Observer } from '../observer';
import { orbitFromOmm, type Orbit } from '../orbit';
import type { OmmRecord } from '../types';

export type FixturePass = {
  noradId: number;
  riseAt: number;
  peakAt: number;
  setAt: number;
  maxElevation: number;
  visible: [number, number][];
};

export const skyfield = fixture as Omit<typeof fixture, 'passes'> & { passes: FixturePass[] };

export const london: Observer = skyfield.observer;

const records: OmmRecord[] = [...visual, ...stations];

export const orbits = new Map<number, Orbit>(
  records.map((omm) => [omm.NORAD_CAT_ID, orbitFromOmm(omm)]),
);

export function orbitFor(noradId: number): Orbit {
  const orbit = orbits.get(noradId);
  if (!orbit) {
    throw new Error(`No orbit for ${noradId}`);
  }
  return orbit;
}
