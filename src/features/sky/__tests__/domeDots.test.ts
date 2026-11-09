import type { UpcomingPass } from '@/data/queries';

import { activeDots, nearestDot } from '../domeDots';

const layout = { centerX: 100, centerY: 100, radius: 90 };

function pass(noradId: number, startAt: number, endAt: number): UpcomingPass {
  return {
    id: noradId,
    noradId,
    startAt,
    peakAt: (startAt + endAt) / 2,
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
  describe('given one satellite inside its visible window and one still to come', () => {
    const passes = [pass(1, 0, 60_000), pass(2, 120_000, 180_000)];

    test('then it places only the satellite inside its window', () => {
      const dots = activeDots(passes, 0, layout, 0);

      expect(dots).toHaveLength(1);
      expect(dots[0]).toMatchObject({ noradId: 1, x: expect.closeTo(100), y: expect.closeTo(40) });
    });
  });

  describe('given a compass heading of 180°', () => {
    test('then the dots rotate with it', () => {
      const [dot] = activeDots([pass(1, 0, 60_000)], 0, layout, 180);

      expect(dot!.y).toBeCloseTo(160);
    });
  });
});

describe('nearestDot', () => {
  const dots = [
    { noradId: 1, x: 10, y: 10 },
    { noradId: 2, x: 20, y: 10 },
  ];

  describe('given a touch within reach of both dots', () => {
    test('then it picks the closest dot', () => {
      expect(nearestDot(dots, { x: 18, y: 12 }, 28)).toBe(2);
    });
  });

  describe('given a touch too far from every dot', () => {
    test('then it picks nothing', () => {
      expect(nearestDot(dots, { x: 80, y: 80 }, 28)).toBeNull();
    });
  });
});
