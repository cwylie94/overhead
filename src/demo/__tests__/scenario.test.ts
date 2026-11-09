import { bundledSnapshot } from '@/data/snapshot';

import { DEMO_LEAD, DEMO_NORAD_ID, demoStartTime, findDemoPass } from '../scenario';

const demoPass = findDemoPass(bundledSnapshot)!;

const SNAPSHOT_WITHOUT_ISS = {
  ...bundledSnapshot,
  groups: {
    ...bundledSnapshot.groups,
    stations: bundledSnapshot.groups.stations.filter((omm) => omm.NORAD_CAT_ID !== DEMO_NORAD_ID),
  },
};

const SNAPSHOT_WITH_ISS_OVER_THE_EQUATOR = {
  ...bundledSnapshot,
  groups: {
    ...bundledSnapshot.groups,
    stations: bundledSnapshot.groups.stations.map((omm) =>
      omm.NORAD_CAT_ID === DEMO_NORAD_ID ? { ...omm, INCLINATION: 0 } : omm,
    ),
  },
};

describe('findDemoPass', () => {
  describe('given the bundled snapshot', () => {
    test('then it picks an ISS pass', () => {
      expect(demoPass.noradId).toBe(DEMO_NORAD_ID);
    });

    test('then the pass starts after the snapshot was taken', () => {
      expect(demoPass.startAt).toBeGreaterThan(bundledSnapshot.fetchedAt);
    });

    test('then the pass peaks at 40° or higher', () => {
      expect(demoPass.maxElevation).toBeGreaterThanOrEqual(40);
    });

    test('then the pass is visible for more than a minute', () => {
      expect(demoPass.endAt - demoPass.startAt).toBeGreaterThan(60_000);
    });

    test('then it picks the same pass every time', () => {
      expect(findDemoPass(bundledSnapshot)).toEqual(demoPass);
    });
  });

  describe('given a snapshot without the ISS', () => {
    test('then there is no demo pass', () => {
      expect(findDemoPass(SNAPSHOT_WITHOUT_ISS)).toBeNull();
    });
  });

  describe('given a snapshot whose ISS orbits over the equator, out of sight of London', () => {
    test('then there is no demo pass', () => {
      expect(findDemoPass(SNAPSHOT_WITH_ISS_OVER_THE_EQUATOR)).toBeNull();
    });
  });
});

describe('demoStartTime', () => {
  describe('given the demo pass', () => {
    test('then it starts the clock a minute before the satellite appears', () => {
      expect(demoStartTime(demoPass)).toBe(demoPass.startAt - DEMO_LEAD);
    });
  });
});
