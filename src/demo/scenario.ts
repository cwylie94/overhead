import type { Snapshot } from '@/data/snapshot/importSnapshot';
import { catalogueEntryFromSatcat } from '@/domain/catalogue';
import { visibleWindow, type PassWindow } from '@/domain/compass';
import type { Observer } from '@/domain/observer';
import { orbitFromOmm } from '@/domain/orbit';
import { findPasses } from '@/domain/passFinder';

const DAY = 24 * 60 * 60 * 1_000;

export const DEMO_NORAD_ID = 25544;
export const DEMO_OBSERVER: Observer = { latitude: 51.5074, longitude: -0.1278, altitude: 0.011 };
export const DEMO_LEAD = 60_000;

const SEARCH_DAYS = 30;
const MIN_PEAK_ELEVATION = 40;
const MAX_MAGNITUDE = -2;

export type DemoPass = PassWindow & { noradId: number };

export function findDemoPass(snapshot: Snapshot): DemoPass | null {
  const omm = snapshot.groups.stations.find((record) => record.NORAD_CAT_ID === DEMO_NORAD_ID);
  const satcat = snapshot.satcat.find((record) => record.NORAD_CAT_ID === DEMO_NORAD_ID);
  if (!omm || !satcat) {
    return null;
  }

  const passes = findPasses(
    orbitFromOmm(omm),
    {
      observer: DEMO_OBSERVER,
      from: snapshot.fetchedAt,
      to: snapshot.fetchedAt + SEARCH_DAYS * DAY,
      minElevation: 10,
    },
    catalogueEntryFromSatcat(satcat, true).standardMagnitude,
  );

  for (const pass of passes) {
    const window = visibleWindow(pass);
    const bright = pass.peakMagnitude !== null && pass.peakMagnitude <= MAX_MAGNITUDE;
    if (window && window.maxElevation >= MIN_PEAK_ELEVATION && bright) {
      return { ...window, noradId: pass.noradId };
    }
  }
  return null;
}

export function demoStartTime(pass: DemoPass): number {
  return pass.startAt - DEMO_LEAD;
}
