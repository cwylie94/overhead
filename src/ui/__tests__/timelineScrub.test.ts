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
  describe('given passes starting at 100, 110 and 400 minutes', () => {
    const starts = [100 * MINUTE, 110 * MINUTE, 400 * MINUTE];

    test('then it picks the pass starting closest to the finger', () => {
      expect(nearestStart(starts, 107 * MINUTE, LOUPE_SPAN / 2)).toBe(1);
    });

    test('then it finds nothing when no pass is in the magnifier', () => {
      expect(nearestStart(starts, 250 * MINUTE, LOUPE_SPAN / 2)).toBe(-1);
    });
  });
});

describe('loupeLeft', () => {
  describe('given a 260-point magnifier over a 360-point timeline', () => {
    test('then it centres the magnifier on the finger', () => {
      expect(loupeLeft(150, 360, 260)).toBe(20);
    });

    test.each([
      { end: 'left', finger: 10, left: 0 },
      { end: 'right', finger: 350, left: 100 },
    ])('then it keeps the magnifier on screen at the $end end', ({ finger, left }) => {
      expect(loupeLeft(finger, 360, 260)).toBe(left);
    });
  });
});

describe('loupeX', () => {
  describe('given a 260-point magnifier centred on 300 minutes', () => {
    test('then the time under the finger is in the middle of the magnifier', () => {
      expect(loupeX(300 * MINUTE, 300 * MINUTE, 260)).toBe(130);
    });

    test('then the magnified span reaches the full width', () => {
      expect(loupeX(300 * MINUTE + LOUPE_SPAN / 2, 300 * MINUTE, 260)).toBe(260);
    });
  });
});

describe('loupeLabelTimes', () => {
  describe('given a 10-hour night', () => {
    test('then the marks reach past the start of the night', () => {
      expect(loupeLabelTimes(range)[0]).toBeLessThanOrEqual(
        range.from - LOUPE_SPAN + LOUPE_LABEL_EVERY,
      );
    });

    test('then the marks reach past the end of the night', () => {
      const times = loupeLabelTimes(range);

      expect(times[times.length - 1]).toBeGreaterThanOrEqual(
        range.to + LOUPE_SPAN - LOUPE_LABEL_EVERY,
      );
    });

    test('then it marks every quarter hour', () => {
      expect(loupeLabelTimes(range).every((time) => time % LOUPE_LABEL_EVERY === 0)).toBe(true);
    });
  });
});
