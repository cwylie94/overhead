import { compassPoint, visibleWindow } from '../compass';
import type { TrackPoint } from '../types';

describe('compassPoint', () => {
  test.each([
    [0, 'N'],
    [22.4, 'N'],
    [22.5, 'NE'],
    [45, 'NE'],
    [90, 'E'],
    [135, 'SE'],
    [180, 'S'],
    [225, 'SW'],
    [270, 'W'],
    [315, 'NW'],
    [337.4, 'NW'],
    [337.5, 'N'],
    [359.9, 'N'],
    [360, 'N'],
    [-45, 'NW'],
    [405, 'NE'],
  ])('%d degrees is %s', (azimuth, expected) => {
    expect(compassPoint(azimuth)).toBe(expected);
  });
});

describe('visibleWindow', () => {
  const track: TrackPoint[] = [
    { time: 0, azimuth: 300, elevation: 10 },
    { time: 60_000, azimuth: 0, elevation: 60 },
    { time: 120_000, azimuth: 130, elevation: 10 },
  ];

  test('spans the visible parts and names where they appear and disappear', () => {
    const window = visibleWindow({
      track,
      visible: [
        { startAt: 0, endAt: 30_000 },
        { startAt: 50_000, endAt: 120_000 },
      ],
    });

    expect(window).toEqual({ startAt: 0, endAt: 120_000, appears: 'NW', disappears: 'SE' });
  });

  test('uses the visible part, not the whole pass', () => {
    const window = visibleWindow({ track, visible: [{ startAt: 60_000, endAt: 120_000 }] });

    expect(window?.appears).toBe('N');
  });

  test('is null for a pass with no visible part', () => {
    expect(visibleWindow({ track, visible: [] })).toBeNull();
  });
});
