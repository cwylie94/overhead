'worklet';

import { visibleWindow } from '@/domain/compass';
import { orbitFromOmm } from '@/domain/orbit';
import { findPasses, type PassSearch } from '@/domain/passFinder';
import type { OmmRecord } from '@/domain/types';

import type { NewPass } from '../schema';

export type PassOrbit = {
  noradId: number;
  omm: OmmRecord;
  standardMagnitude: number | null;
};

export function passRows(orbits: PassOrbit[], search: PassSearch): NewPass[] {
  const rows: NewPass[] = [];
  for (const { noradId, omm, standardMagnitude } of orbits) {
    for (const pass of findPasses(orbitFromOmm(omm), search, standardMagnitude)) {
      const window = visibleWindow(pass);
      if (window) {
        rows.push({
          noradId,
          startAt: window.startAt,
          peakAt: window.peakAt,
          endAt: window.endAt,
          maxElevation: window.maxElevation,
          peakMagnitude: pass.peakMagnitude,
          track: pass.track,
        });
      }
    }
  }
  return rows;
}
