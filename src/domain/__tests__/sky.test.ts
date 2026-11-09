import { lookAnglesFromEci, toGeodetic } from '../observer';
import { positionAt } from '../orbit';
import { findPasses, type FoundPass } from '../passFinder';
import { aimError, angularSeparation, positionOnTrack } from '../sky';
import { london, orbitFor, skyfield } from '../testing/skyfieldFixture';
import type { TrackPoint } from '../types';

const ACROSS_NORTH: TrackPoint[] = [
  { time: 0, azimuth: 350, elevation: 10 },
  { time: 10_000, azimuth: 10, elevation: 20 },
  { time: 20_000, azimuth: 30, elevation: 10 },
];

const ISS_ORBIT = orbitFor(25544);

const RISING_IN_THE_EAST: TrackPoint[] = [
  { time: 0, azimuth: 90, elevation: 30 },
  { time: 10_000, azimuth: 90, elevation: 40 },
];

describe('angularSeparation', () => {
  describe('given two points in the sky', () => {
    test.each([
      {
        points: 'two copies of the same point',
        a: { azimuth: 120, elevation: 40 },
        b: { azimuth: 120, elevation: 40 },
        expected: 0,
      },
      {
        points: 'the zenith and the horizon',
        a: { azimuth: 0, elevation: 90 },
        b: { azimuth: 200, elevation: 0 },
        expected: 90,
      },
      {
        points: 'opposite points on the horizon',
        a: { azimuth: 0, elevation: 0 },
        b: { azimuth: 180, elevation: 0 },
        expected: 180,
      },
      {
        points: 'two points 10 degrees apart in elevation',
        a: { azimuth: 45, elevation: 20 },
        b: { azimuth: 45, elevation: 30 },
        expected: 10,
      },
      {
        points: 'points either side of north',
        a: { azimuth: 355, elevation: 0 },
        b: { azimuth: 5, elevation: 0 },
        expected: 10,
      },
      {
        points: 'the zenith at two azimuths',
        a: { azimuth: 10, elevation: 90 },
        b: { azimuth: 250, elevation: 90 },
        expected: 0,
      },
    ])('then $points are $expected degrees apart', ({ a, b, expected }) => {
      expect(angularSeparation(a, b)).toBeCloseTo(expected, 6);
    });
  });

  describe('given two points 10 degrees of azimuth apart near the zenith', () => {
    test('then they are under 2 degrees of sky apart', () => {
      expect(
        angularSeparation({ azimuth: 0, elevation: 80 }, { azimuth: 10, elevation: 80 }),
      ).toBeCloseTo(1.736, 2);
    });
  });

  describe('given two points a thousandth of a degree apart', () => {
    test('then the separation is still accurate', () => {
      expect(
        angularSeparation({ azimuth: 100, elevation: 30 }, { azimuth: 100, elevation: 30.001 }),
      ).toBeCloseTo(0.001, 9);
    });
  });
});

describe('positionOnTrack', () => {
  describe('given a track that crosses north', () => {
    test('then it returns the stored point at a sample time', () => {
      expect(positionOnTrack(ACROSS_NORTH, 10_000)).toEqual({
        azimuth: expect.closeTo(10),
        elevation: expect.closeTo(20),
      });
    });

    test('then halfway between samples it stays near north instead of swinging round the compass', () => {
      const halfway = positionOnTrack(ACROSS_NORTH, 5_000)!;

      expect(Math.min(halfway.azimuth, 360 - halfway.azimuth)).toBeLessThan(1);
    });

    test('then halfway between samples its elevation is between theirs', () => {
      const halfway = positionOnTrack(ACROSS_NORTH, 5_000)!;

      expect(halfway.elevation).toBeGreaterThan(14);
      expect(halfway.elevation).toBeLessThan(16);
    });

    test('then it is null before the track starts', () => {
      expect(positionOnTrack(ACROSS_NORTH, -1)).toBeNull();
    });

    test('then it is null after the track ends', () => {
      expect(positionOnTrack(ACROSS_NORTH, 20_001)).toBeNull();
    });
  });

  describe('given an empty track', () => {
    test('then it is null', () => {
      expect(positionOnTrack([], 0)).toBeNull();
    });
  });

  describe('given an ISS pass over London that goes nearly overhead', () => {
    let overhead: FoundPass;

    beforeEach(() => {
      overhead = findPasses(ISS_ORBIT, {
        observer: london,
        from: skyfield.window.start,
        to: skyfield.window.end,
        minElevation: 10,
      }).find((pass) => pass.maxElevation > 80)!;
    });

    test('then it stays within half a degree of the real position between samples', () => {
      const observer = toGeodetic(london);
      let worst = 0;

      for (let time = overhead.riseAt; time < overhead.setAt; time += 1_000) {
        const truth = lookAnglesFromEci(positionAt(ISS_ORBIT, time)!, observer, time);
        worst = Math.max(worst, angularSeparation(truth, positionOnTrack(overhead.track, time)!));
      }

      expect(worst).toBeLessThan(0.5);
    });
  });
});

describe('aimError', () => {
  describe('given the phone points at where the track starts in the east', () => {
    test('then it is the angle to the predicted position', () => {
      expect(aimError({ azimuth: 90, elevation: 30 }, RISING_IN_THE_EAST, 5_000)).toBeCloseTo(5, 3);
    });

    test('then it is null once the satellite is no longer on its track', () => {
      expect(aimError({ azimuth: 90, elevation: 30 }, RISING_IN_THE_EAST, 60_000)).toBeNull();
    });
  });
});
