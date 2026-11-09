import { compassPoint, visibleWindow } from '../compass';
import type { TrackPoint } from '../types';

const NORTHWEST_TO_SOUTHEAST: TrackPoint[] = [
  { time: 0, azimuth: 300, elevation: 10 },
  { time: 60_000, azimuth: 0, elevation: 60 },
  { time: 120_000, azimuth: 130, elevation: 10 },
];

describe('compassPoint', () => {
  describe('given an azimuth on a compass point', () => {
    test.each([
      { azimuth: 0, expected: 'N' },
      { azimuth: 45, expected: 'NE' },
      { azimuth: 90, expected: 'E' },
      { azimuth: 135, expected: 'SE' },
      { azimuth: 180, expected: 'S' },
      { azimuth: 225, expected: 'SW' },
      { azimuth: 270, expected: 'W' },
      { azimuth: 315, expected: 'NW' },
    ])('then $azimuth degrees is $expected', ({ azimuth, expected }) => {
      expect(compassPoint(azimuth)).toBe(expected);
    });
  });

  describe('given an azimuth either side of the line between two points', () => {
    test.each([
      { azimuth: 22.4, expected: 'N' },
      { azimuth: 22.5, expected: 'NE' },
      { azimuth: 337.4, expected: 'NW' },
      { azimuth: 337.5, expected: 'N' },
      { azimuth: 359.9, expected: 'N' },
    ])('then $azimuth degrees is $expected', ({ azimuth, expected }) => {
      expect(compassPoint(azimuth)).toBe(expected);
    });
  });

  describe('given an azimuth that wraps round the compass', () => {
    test.each([
      { azimuth: 360, expected: 'N' },
      { azimuth: -45, expected: 'NW' },
      { azimuth: 405, expected: 'NE' },
    ])('then $azimuth degrees is $expected', ({ azimuth, expected }) => {
      expect(compassPoint(azimuth)).toBe(expected);
    });
  });
});

describe('visibleWindow', () => {
  describe('given a pass visible in two parts', () => {
    test('then it spans the visible parts with their peak and where they appear and disappear', () => {
      expect(
        visibleWindow({
          track: NORTHWEST_TO_SOUTHEAST,
          visible: [
            { startAt: 0, endAt: 30_000 },
            { startAt: 50_000, endAt: 120_000 },
          ],
        }),
      ).toEqual({
        startAt: 0,
        endAt: 120_000,
        peakAt: 60_000,
        maxElevation: 60,
        appears: 'NW',
        disappears: 'SE',
      });
    });
  });

  describe('given a pass visible only from its peak onwards', () => {
    test('then it appears where the visible part starts, not where the pass rises', () => {
      const window = visibleWindow({
        track: NORTHWEST_TO_SOUTHEAST,
        visible: [{ startAt: 60_000, endAt: 120_000 }],
      });

      expect(window?.appears).toBe('N');
    });
  });

  describe('given a pass that enters shadow before culmination', () => {
    const visible = [{ startAt: 0, endAt: 30_000 }];

    test('then it peaks at the last visible moment', () => {
      expect(visibleWindow({ track: NORTHWEST_TO_SOUTHEAST, visible })!.peakAt).toBe(30_000);
    });

    test('then its highest point is between rising and culmination', () => {
      const window = visibleWindow({ track: NORTHWEST_TO_SOUTHEAST, visible })!;

      expect(window.maxElevation).toBeGreaterThan(10);
      expect(window.maxElevation).toBeLessThan(60);
    });
  });

  describe('given a pass with no visible part', () => {
    test('then there is no window', () => {
      expect(visibleWindow({ track: NORTHWEST_TO_SOUTHEAST, visible: [] })).toBeNull();
    });
  });
});
