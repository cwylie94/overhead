import { bundledSnapshot } from '@/data/snapshot';

import { dockingHosts, stationMembers } from '../docking';
import type { OmmRecord } from '../types';

const ISS = 25544;
const CSS = 48274;

describe('dockingHosts', () => {
  const hosts = dockingHosts([
    ...bundledSnapshot.groups.stations,
    ...bundledSnapshot.groups.visual,
  ]);

  test('folds ISS modules and visiting vehicles into the ISS', () => {
    for (const docked of [36086, 49044, 68837, 100057, 100712, 100882, 101031]) {
      expect(hosts.get(docked)).toBe(ISS);
    }
  });

  test('folds Chinese station modules and visitors into Tianhe', () => {
    for (const docked of [53239, 54216, 69049, 69180]) {
      expect(hosts.get(docked)).toBe(CSS);
    }
  });

  test('leaves the stations themselves and free flyers alone', () => {
    expect(hosts.has(ISS)).toBe(false);
    expect(hosts.has(CSS)).toBe(false);
    expect(hosts.has(66515)).toBe(false);
    expect(hosts.has(20580)).toBe(false);
  });

  test('lets a vehicle go once it undocks and has an orbit of its own', () => {
    const station = bundledSnapshot.groups.stations.find((omm) => omm.NORAD_CAT_ID === ISS)!;
    const capsule: OmmRecord = { ...station, NORAD_CAT_ID: 100882, OBJECT_NAME: 'CREW DRAGON 13' };

    expect(dockingHosts([station, capsule]).get(100882)).toBe(ISS);
    expect(
      dockingHosts([station, { ...capsule, MEAN_ANOMALY: capsule.MEAN_ANOMALY + 0.5 }]).has(100882),
    ).toBe(false);
  });

  test('picks the oldest object as the host whatever the order', () => {
    const station = bundledSnapshot.groups.stations.find((omm) => omm.NORAD_CAT_ID === ISS)!;
    const module = { ...station, NORAD_CAT_ID: 49044 };

    expect(dockingHosts([module, station]).get(49044)).toBe(ISS);
  });
});

describe('stationMembers', () => {
  const members = stationMembers(bundledSnapshot.groups.stations);

  test('includes both stations and everything docked to them', () => {
    for (const id of [ISS, CSS, 36086, 49044, 100882, 53239, 69180]) {
      expect(members.has(id)).toBe(true);
    }
  });

  test('leaves out CubeSats released from the ISS, loose modules and debris', () => {
    for (const id of [66906, 67683, 67685, 67688, 66515, 49271]) {
      expect(members.has(id)).toBe(false);
    }
  });

  test('recognises a station by name when nothing is docked to it', () => {
    const tianhe = bundledSnapshot.groups.stations.find((omm) => omm.NORAD_CAT_ID === CSS)!;

    expect(stationMembers([tianhe]).has(CSS)).toBe(true);
    expect(stationMembers([{ ...tianhe, OBJECT_NAME: 'TIANGONG 3', NORAD_CAT_ID: 1 }]).has(1)).toBe(
      true,
    );
  });
});
