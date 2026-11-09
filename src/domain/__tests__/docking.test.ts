import { bundledSnapshot } from '@/data/snapshot';

import { dockingHosts, stationMembers } from '../docking';
import type { OmmRecord } from '../types';

const ISS = 25544;
const CSS = 48274;

const BUNDLED = [...bundledSnapshot.groups.stations, ...bundledSnapshot.groups.visual];
const ISS_RECORD = bundledSnapshot.groups.stations.find((omm) => omm.NORAD_CAT_ID === ISS)!;
const TIANHE_RECORD = bundledSnapshot.groups.stations.find((omm) => omm.NORAD_CAT_ID === CSS)!;
const DOCKED_CAPSULE: OmmRecord = {
  ...ISS_RECORD,
  NORAD_CAT_ID: 100882,
  OBJECT_NAME: 'CREW DRAGON 13',
};

describe('dockingHosts', () => {
  describe('given the bundled stations and visual groups', () => {
    test('then ISS modules and visiting vehicles fold into the ISS', () => {
      const hosts = dockingHosts(BUNDLED);

      for (const docked of [36086, 49044, 68837, 100057, 100712, 100882, 101031]) {
        expect(hosts.get(docked)).toBe(ISS);
      }
    });

    test('then Chinese station modules and visitors fold into Tianhe', () => {
      const hosts = dockingHosts(BUNDLED);

      for (const docked of [53239, 54216, 69049, 69180]) {
        expect(hosts.get(docked)).toBe(CSS);
      }
    });

    test('then the stations themselves and free flyers are left alone', () => {
      const hosts = dockingHosts(BUNDLED);

      expect(hosts.has(ISS)).toBe(false);
      expect(hosts.has(CSS)).toBe(false);
      expect(hosts.has(66515)).toBe(false);
      expect(hosts.has(20580)).toBe(false);
    });
  });

  describe('given a capsule sharing the ISS’s orbit exactly', () => {
    test('then it is docked to the ISS', () => {
      expect(dockingHosts([ISS_RECORD, DOCKED_CAPSULE]).get(100882)).toBe(ISS);
    });
  });

  describe('given a capsule that has undocked and has an orbit of its own', () => {
    test('then it is let go', () => {
      expect(
        dockingHosts([
          ISS_RECORD,
          { ...DOCKED_CAPSULE, MEAN_ANOMALY: DOCKED_CAPSULE.MEAN_ANOMALY + 0.5 },
        ]).has(100882),
      ).toBe(false);
    });
  });

  describe('given a module listed before the station it is docked to', () => {
    test('then the oldest object is still the host', () => {
      expect(dockingHosts([{ ...ISS_RECORD, NORAD_CAT_ID: 49044 }, ISS_RECORD]).get(49044)).toBe(
        ISS,
      );
    });
  });
});

describe('stationMembers', () => {
  describe('given the bundled stations group', () => {
    test('then it includes both stations and everything docked to them', () => {
      const members = stationMembers(bundledSnapshot.groups.stations);

      for (const id of [ISS, CSS, 36086, 49044, 100882, 53239, 69180]) {
        expect(members.has(id)).toBe(true);
      }
    });

    test('then it leaves out CubeSats released from the ISS, loose modules and debris', () => {
      const members = stationMembers(bundledSnapshot.groups.stations);

      for (const id of [66906, 67683, 67685, 67688, 66515, 49271]) {
        expect(members.has(id)).toBe(false);
      }
    });
  });

  describe('given Tianhe with nothing docked to it', () => {
    test('then it is recognised as a station by name', () => {
      expect(stationMembers([TIANHE_RECORD]).has(CSS)).toBe(true);
    });
  });

  describe('given a Tiangong with nothing docked to it', () => {
    test('then it is recognised as a station by name', () => {
      expect(
        stationMembers([{ ...TIANHE_RECORD, OBJECT_NAME: 'TIANGONG 3', NORAD_CAT_ID: 1 }]).has(1),
      ).toBe(true);
    });
  });
});
