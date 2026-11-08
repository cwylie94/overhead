import type { SkyPass } from '@/data/queries';

import { activeDots, nearestDot } from '../domeDots';

const layout = { centerX: 100, centerY: 100, radius: 90 };

function pass(noradId: number, startAt: number, endAt: number): SkyPass {
  return {
    id: noradId,
    noradId,
    startAt,
    endAt,
    maxElevation: 60,
    peakMagnitude: 2,
    name: `SAT ${noradId}`,
    rarity: 'common',
    track: [
      { time: startAt - 10_000, azimuth: 0, elevation: 5 },
      { time: startAt, azimuth: 0, elevation: 30 },
      { time: endAt, azimuth: 180, elevation: 30 },
    ],
  };
}

describe('activeDots', () => {
  test('places only satellites inside their visible window', () => {
    const dots = activeDots([pass(1, 0, 60_000), pass(2, 120_000, 180_000)], 0, layout, 0);

    expect(dots).toHaveLength(1);
    expect(dots[0]).toMatchObject({ noradId: 1, x: expect.closeTo(100), y: expect.closeTo(40) });
  });

  test('rotates with the compass heading', () => {
    const [dot] = activeDots([pass(1, 0, 60_000)], 0, layout, 180);

    expect(dot!.y).toBeCloseTo(160);
  });
});

describe('nearestDot', () => {
  const dots = [
    { noradId: 1, x: 10, y: 10 },
    { noradId: 2, x: 20, y: 10 },
  ];

  test('picks the closest dot within reach', () => {
    expect(nearestDot(dots, { x: 18, y: 12 }, 28)).toBe(2);
  });

  test('picks nothing when every dot is too far away', () => {
    expect(nearestDot(dots, { x: 80, y: 80 }, 28)).toBeNull();
  });
});
