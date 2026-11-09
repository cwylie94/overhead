import { LOUPE_SPAN, nearestStart } from '@/features/tonight/timelineScrub';

import { DEMO_PASSES, DEMO_SPAN, DEMO_START, demoCenter, progressAt } from '../sampleNight';

const starts = DEMO_PASSES.map((pass) => pass.startAt);

describe('DEMO_PASSES', () => {
  describe('given the sample night', () => {
    test('then every pass starts on the track', () => {
      for (const start of starts) {
        expect(start).toBeGreaterThan(DEMO_START);
        expect(start).toBeLessThan(DEMO_START + DEMO_SPAN);
      }
    });

    test('then some passes are too close together to pick apart on the track', () => {
      const gaps = starts.slice(1).map((start, index) => start - starts[index]!);

      expect(Math.min(...gaps)).toBeLessThan(DEMO_SPAN / 100);
    });
  });
});

describe('DEMO_SPAN', () => {
  describe('given Tonight’s loupe span', () => {
    test('then the loupe magnifies about as much of the track as Tonight does', () => {
      expect(LOUPE_SPAN / DEMO_SPAN).toBeCloseTo(0.12, 2);
    });
  });
});

describe('demoCenter', () => {
  describe('given the finger sweeps the whole demo', () => {
    test('then it picks out every pass', () => {
      const picked = new Set<number>();
      for (let step = 0; step <= 200; step += 1) {
        picked.add(nearestStart(starts, demoCenter(step / 200), LOUPE_SPAN / 2));
      }

      expect([...picked].filter((index) => index >= 0).sort((a, b) => a - b)).toEqual(
        starts.map((_, index) => index),
      );
    });
  });

  describe('given the progress at the start of the ISS pass', () => {
    test('then the finger rests on the ISS pass', () => {
      const iss = DEMO_PASSES[1]!;

      expect(demoCenter(progressAt(iss.startAt))).toBeCloseTo(iss.startAt, 0);
    });
  });
});
