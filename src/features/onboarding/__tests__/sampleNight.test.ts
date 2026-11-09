import { LOUPE_SPAN, nearestStart } from '@/features/tonight/timelineScrub';

import { DEMO_PASSES, DEMO_SPAN, DEMO_START, demoCenter, progressAt } from '../sampleNight';

const starts = DEMO_PASSES.map((pass) => pass.startAt);

describe('the loupe demo', () => {
  test('keeps every sample pass on the track', () => {
    for (const start of starts) {
      expect(start).toBeGreaterThan(DEMO_START);
      expect(start).toBeLessThan(DEMO_START + DEMO_SPAN);
    }
  });

  test('magnifies about as much of the track as Tonight does', () => {
    expect(LOUPE_SPAN / DEMO_SPAN).toBeCloseTo(0.12, 2);
  });

  test('includes passes too close together to pick apart on the track', () => {
    const gaps = starts.slice(1).map((start, index) => start - starts[index]!);

    expect(Math.min(...gaps)).toBeLessThan(DEMO_SPAN / 100);
  });

  test('sweeps the finger far enough to pick out every pass', () => {
    const picked = new Set<number>();
    for (let step = 0; step <= 200; step += 1) {
      picked.add(nearestStart(starts, demoCenter(step / 200), LOUPE_SPAN / 2));
    }

    expect([...picked].filter((index) => index >= 0).sort((a, b) => a - b)).toEqual(
      starts.map((_, index) => index),
    );
  });

  test('can rest on a chosen pass', () => {
    const iss = DEMO_PASSES[1]!;

    expect(demoCenter(progressAt(iss.startAt))).toBeCloseTo(iss.startAt, 0);
  });
});
