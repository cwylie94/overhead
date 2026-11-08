import type { OmmRecord, TrackPoint } from '@/domain/types';

import type { NewOrbit, NewPass, NewSatellite } from '../schema';

export const ISS_NORAD_ID = 25544;
export const HUBBLE_NORAD_ID = 20580;

export function makeSatellite(overrides: Partial<NewSatellite> = {}): NewSatellite {
  return {
    noradId: ISS_NORAD_ID,
    name: 'ISS (ZARYA)',
    objectType: 'payload',
    owner: 'ISS',
    launchDate: '1998-11-20',
    rarity: 'common',
    ...overrides,
  };
}

export function makeOmm(overrides: Partial<OmmRecord> = {}): OmmRecord {
  return {
    OBJECT_NAME: 'ISS (ZARYA)',
    OBJECT_ID: '1998-067A',
    EPOCH: '2026-11-08T12:00:00.000000',
    MEAN_MOTION: 15.5,
    ECCENTRICITY: 0.0004,
    INCLINATION: 51.64,
    RA_OF_ASC_NODE: 120.1,
    ARG_OF_PERICENTER: 80.2,
    MEAN_ANOMALY: 280.3,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: ISS_NORAD_ID,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 50000,
    BSTAR: 0.0002,
    MEAN_MOTION_DOT: 0.0001,
    MEAN_MOTION_DDOT: 0,
    ...overrides,
  };
}

export function makeOrbit(overrides: Partial<NewOrbit> = {}): NewOrbit {
  const noradId = overrides.noradId ?? ISS_NORAD_ID;
  return {
    noradId,
    group: 'stations',
    omm: makeOmm({ NORAD_CAT_ID: noradId }),
    epoch: Date.UTC(2026, 10, 8, 12),
    fetchedAt: Date.UTC(2026, 10, 8, 13),
    ...overrides,
  };
}

const TRACK: TrackPoint[] = [
  { time: 0, azimuth: 310, elevation: 10 },
  { time: 10_000, azimuth: 0, elevation: 60 },
  { time: 20_000, azimuth: 130, elevation: 10 },
];

export function makePass(overrides: Partial<NewPass> = {}): NewPass {
  const startAt = overrides.startAt ?? Date.UTC(2026, 10, 8, 21, 12);
  return {
    noradId: ISS_NORAD_ID,
    startAt,
    peakAt: startAt + 180_000,
    endAt: startAt + 360_000,
    maxElevation: 62,
    peakMagnitude: -3.4,
    track: TRACK,
    ...overrides,
  };
}
