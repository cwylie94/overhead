import {
  LOUPE_LABEL_EVERY,
  LOUPE_SPAN,
  loupeLabelTimes,
  loupeLeft,
  loupeX,
  nearestStart,
} from '../timelineScrub';

const MINUTE = 60_000;
const range = { from: 0, to: 600 * MINUTE };

describe('nearestStart', () => {
  const starts = [100 * MINUTE, 110 * MINUTE, 400 * MINUTE];

  test('picks the pass starting closest to the finger', () => {
    expect(nearestStart(starts, 107 * MINUTE, LOUPE_SPAN / 2)).toBe(1);
  });

  test('finds nothing when no pass is in the magnifier', () => {
    expect(nearestStart(starts, 250 * MINUTE, LOUPE_SPAN / 2)).toBe(-1);
  });
});

describe('loupeLeft', () => {
  test('centres the magnifier on the finger', () => {
    expect(loupeLeft(150, 360, 260)).toBe(20);
  });

  test('keeps the magnifier on screen at either end', () => {
    expect(loupeLeft(10, 360, 260)).toBe(0);
    expect(loupeLeft(350, 360, 260)).toBe(100);
  });
});

describe('loupeX', () => {
  test('puts the time under the finger in the middle of the magnifier', () => {
    expect(loupeX(300 * MINUTE, 300 * MINUTE, 260)).toBe(130);
  });

  test('spreads the magnified span across the full width', () => {
    expect(loupeX(300 * MINUTE + LOUPE_SPAN / 2, 300 * MINUTE, 260)).toBe(260);
  });
});

describe('loupeLabelTimes', () => {
  test('marks every quarter hour, reaching past both ends of the night', () => {
    const times = loupeLabelTimes(range);

    expect(times[0]).toBeLessThanOrEqual(range.from - LOUPE_SPAN + LOUPE_LABEL_EVERY);
    expect(times[times.length - 1]).toBeGreaterThanOrEqual(
      range.to + LOUPE_SPAN - LOUPE_LABEL_EVERY,
    );
    expect(times.every((time) => time % LOUPE_LABEL_EVERY === 0)).toBe(true);
  });
});
