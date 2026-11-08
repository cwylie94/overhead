import { lookAnglesFromEci, toGeodetic } from '../observer';
import { positionAt } from '../orbit';
import { findPasses } from '../passFinder';
import { aimError, angularSeparation, positionOnTrack } from '../sky';
import { london, orbitFor, skyfield } from '../testing/skyfieldFixture';
import type { TrackPoint } from '../types';

describe('angularSeparation', () => {
  test.each([
    ['the same point', { azimuth: 120, elevation: 40 }, { azimuth: 120, elevation: 40 }, 0],
    [
      'straight up and the horizon',
      { azimuth: 0, elevation: 90 },
      { azimuth: 200, elevation: 0 },
      90,
    ],
    ['opposite horizons', { azimuth: 0, elevation: 0 }, { azimuth: 180, elevation: 0 }, 180],
    [
      '10 degrees apart in elevation',
      { azimuth: 45, elevation: 20 },
      { azimuth: 45, elevation: 30 },
      10,
    ],
    ['across north', { azimuth: 355, elevation: 0 }, { azimuth: 5, elevation: 0 }, 10],
    [
      'any azimuth at the zenith',
      { azimuth: 10, elevation: 90 },
      { azimuth: 250, elevation: 90 },
      0,
    ],
  ])('between %s is %d degrees', (_, a, b, expected) => {
    expect(angularSeparation(a, b)).toBeCloseTo(expected, 6);
  });

  test('10 degrees of azimuth near the zenith is under 2 degrees of sky', () => {
    expect(
      angularSeparation({ azimuth: 0, elevation: 80 }, { azimuth: 10, elevation: 80 }),
    ).toBeCloseTo(1.736, 2);
  });

  test('is accurate for tiny separations', () => {
    expect(
      angularSeparation({ azimuth: 100, elevation: 30 }, { azimuth: 100, elevation: 30.001 }),
    ).toBeCloseTo(0.001, 9);
  });
});

describe('positionOnTrack', () => {
  const track: TrackPoint[] = [
    { time: 0, azimuth: 350, elevation: 10 },
    { time: 10_000, azimuth: 10, elevation: 20 },
    { time: 20_000, azimuth: 30, elevation: 10 },
  ];

  test('returns the stored point at a sample time', () => {
    expect(positionOnTrack(track, 10_000)).toEqual({
      azimuth: expect.closeTo(10),
      elevation: expect.closeTo(20),
    });
  });

  test('interpolates across north instead of swinging round the compass', () => {
    const halfway = positionOnTrack(track, 5_000)!;

    expect(Math.min(halfway.azimuth, 360 - halfway.azimuth)).toBeLessThan(1);
    expect(halfway.elevation).toBeGreaterThan(14);
    expect(halfway.elevation).toBeLessThan(16);
  });

  test('returns null outside the track', () => {
    expect(positionOnTrack(track, -1)).toBeNull();
    expect(positionOnTrack(track, 20_001)).toBeNull();
    expect(positionOnTrack([], 0)).toBeNull();
  });

  test('stays within a fraction of a degree of the real position between samples', () => {
    const iss = orbitFor(25544);
    const search = {
      observer: london,
      from: skyfield.window.start,
      to: skyfield.window.end,
      minElevation: 10,
    };
    const overhead = findPasses(iss, search).find((pass) => pass.maxElevation > 80)!;
    const observer = toGeodetic(london);
    let worst = 0;

    for (let time = overhead.riseAt; time < overhead.setAt; time += 1_000) {
      const truth = lookAnglesFromEci(positionAt(iss, time)!, observer, time);
      worst = Math.max(worst, angularSeparation(truth, positionOnTrack(overhead.track, time)!));
    }

    expect(worst).toBeLessThan(0.5);
  });
});

describe('aimError', () => {
  const track: TrackPoint[] = [
    { time: 0, azimuth: 90, elevation: 30 },
    { time: 10_000, azimuth: 90, elevation: 40 },
  ];

  test('is the angle between where the phone points and the predicted position', () => {
    expect(aimError({ azimuth: 90, elevation: 30 }, track, 5_000)).toBeCloseTo(5, 3);
  });

  test('is null when the satellite is not on its track', () => {
    expect(aimError({ azimuth: 90, elevation: 30 }, track, 60_000)).toBeNull();
  });
});
