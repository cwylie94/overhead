import { bundledSnapshot } from '@/data/snapshot';

import { DEMO_LEAD, DEMO_NORAD_ID, demoStartTime, findDemoPass } from '../scenario';

describe('the demo pass', () => {
  const pass = findDemoPass(bundledSnapshot)!;

  test('is a high, bright ISS pass after the snapshot was taken', () => {
    expect(pass.noradId).toBe(DEMO_NORAD_ID);
    expect(pass.startAt).toBeGreaterThan(bundledSnapshot.fetchedAt);
    expect(pass.maxElevation).toBeGreaterThanOrEqual(40);
    expect(pass.endAt - pass.startAt).toBeGreaterThan(60_000);
  });

  test('starts the clock a minute before the satellite appears', () => {
    expect(demoStartTime(pass)).toBe(pass.startAt - DEMO_LEAD);
  });

  test('is the same every time for the same snapshot', () => {
    expect(findDemoPass(bundledSnapshot)).toEqual(pass);
  });

  test('is missing when the snapshot has no ISS', () => {
    const withoutIss = {
      ...bundledSnapshot,
      groups: {
        ...bundledSnapshot.groups,
        stations: bundledSnapshot.groups.stations.filter(
          (omm) => omm.NORAD_CAT_ID !== DEMO_NORAD_ID,
        ),
      },
    };

    expect(findDemoPass(withoutIss)).toBeNull();
  });
});
