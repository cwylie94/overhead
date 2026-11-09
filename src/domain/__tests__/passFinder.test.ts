import { apogeeAltitudeKm, perigeeAltitudeKm, periodMinutes } from '../orbit';
import { canReachObserver, findPasses, MIN_VISIBLE_DURATION, type FoundPass } from '../passFinder';
import { london, orbitFor, orbits, skyfield, type FixturePass } from '../testing/skyfieldFixture';

const { start: from, end: to } = skyfield.window;
const search = { observer: london, from, to, minElevation: skyfield.minElevation };

const found: FoundPass[] = [...orbits.values()].flatMap((orbit) => findPasses(orbit, search));
const complete = found.filter((pass) => pass.riseAt >= from && pass.setAt <= to);

function matching(expected: FixturePass): FoundPass | undefined {
  return found.find(
    (pass) => pass.noradId === expected.noradId && Math.abs(pass.peakAt - expected.peakAt) < 60_000,
  );
}

function worst(values: number[]): number {
  return Math.max(0, ...values.map(Math.abs));
}

const pairs = skyfield.passes.map((expected) => ({ expected, actual: matching(expected) }));

function compareVisibleParts() {
  const longEnough = MIN_VISIBLE_DURATION + 5_000;
  const unmatched: unknown[] = [];
  const differences: number[] = [];

  for (const { expected, actual } of pairs) {
    for (const [startAt, endAt] of expected.visible.filter(([s, e]) => e - s >= longEnough)) {
      const match = actual!.visible.find(
        (part) =>
          Math.abs(part.startAt - startAt) < 10_000 && Math.abs(part.endAt - endAt) < 10_000,
      );
      if (match) {
        differences.push(match.startAt - startAt, match.endAt - endAt);
      } else {
        unmatched.push({ noradId: expected.noradId, startAt, endAt, found: actual!.visible });
      }
    }
    for (const part of actual!.visible.filter((p) => p.endAt - p.startAt >= longEnough)) {
      if (
        !expected.visible.some(
          ([s, e]) => Math.abs(s - part.startAt) < 10_000 && Math.abs(e - part.endAt) < 10_000,
        )
      ) {
        unmatched.push({ noradId: expected.noradId, extra: part, expected: expected.visible });
      }
    }
  }

  return { unmatched, differences };
}

const elevationError = ({ expected, actual }: (typeof pairs)[number]) =>
  actual!.maxElevation - expected.maxElevation;

const ISS_PASSES = skyfield.passes.filter((p) => p.noradId === 25544);
const HIGH_ISS_PASS = found.find((p) => p.noradId === 25544 && p.maxElevation > 60)!;

describe('findPasses', () => {
  describe('given one night over London for every satellite, checked against Skyfield', () => {
    test('then it finds every pass Skyfield finds', () => {
      expect(pairs.filter(({ actual }) => !actual).map(({ expected }) => expected)).toEqual([]);
    });

    test('then it finds no passes Skyfield does not', () => {
      const extra = complete.filter(
        (pass) =>
          !skyfield.passes.some(
            (expected) =>
              expected.noradId === pass.noradId && Math.abs(expected.peakAt - pass.peakAt) < 60_000,
          ),
      );
      expect(
        extra.map(({ noradId, peakAt, maxElevation }) => ({ noradId, peakAt, maxElevation })),
      ).toEqual([]);
    });

    test('then rise times agree within 2 seconds', () => {
      expect(
        worst(pairs.map(({ expected, actual }) => actual!.riseAt - expected.riseAt)),
      ).toBeLessThan(2_000);
    });

    test('then set times agree within 2 seconds', () => {
      expect(
        worst(pairs.map(({ expected, actual }) => actual!.setAt - expected.setAt)),
      ).toBeLessThan(2_000);
    });

    test('then peak times agree within 5 seconds', () => {
      expect(
        worst(pairs.map(({ expected, actual }) => actual!.peakAt - expected.peakAt)),
      ).toBeLessThan(5_000);
    });

    test('then peak elevations away from the zenith agree within 0.02 degrees', () => {
      expect(
        worst(pairs.filter(({ expected }) => expected.maxElevation < 85).map(elevationError)),
      ).toBeLessThan(0.02);
    });

    test('then peak elevations near the zenith agree within 0.1 degrees', () => {
      expect(
        worst(pairs.filter(({ expected }) => expected.maxElevation >= 85).map(elevationError)),
      ).toBeLessThan(0.1);
    });

    test('then every visible part longer than the minimum has a match', () => {
      expect(compareVisibleParts().unmatched).toEqual([]);
    });

    test('then more than 500 visible part boundaries agree within 2 seconds', () => {
      const { differences } = compareVisibleParts();

      expect(differences.length).toBeGreaterThan(500);
      expect(worst(differences)).toBeLessThan(2_000);
    });

    test('then it drops visible parts too short to catch anything', () => {
      const parts = found.flatMap((pass) => pass.visible);

      expect(parts.every(({ startAt, endAt }) => endAt - startAt >= MIN_VISIBLE_DURATION)).toBe(
        true,
      );
    });
  });

  describe('given an ISS pass that climbs above 60 degrees', () => {
    test('then its track starts at the rise', () => {
      expect(HIGH_ISS_PASS.track[0]!.time).toBe(HIGH_ISS_PASS.riseAt);
    });

    test('then its track ends at the set', () => {
      expect(HIGH_ISS_PASS.track[HIGH_ISS_PASS.track.length - 1]!.time).toBe(HIGH_ISS_PASS.setAt);
    });

    test('then its track steps every 10 seconds', () => {
      expect(HIGH_ISS_PASS.track[1]!.time - HIGH_ISS_PASS.track[0]!.time).toBe(10_000);
    });

    test('then its track stays above the horizon', () => {
      expect(Math.min(...HIGH_ISS_PASS.track.map((point) => point.elevation))).toBeGreaterThan(
        skyfield.minElevation - 0.1,
      );
    });

    test('then its track peaks near the maximum elevation', () => {
      expect(Math.max(...HIGH_ISS_PASS.track.map((point) => point.elevation))).toBeCloseTo(
        HIGH_ISS_PASS.maxElevation,
        0,
      );
    });
  });

  describe('given a search window that opens while an ISS pass is in progress', () => {
    const iss = ISS_PASSES[0]!;
    const midPass = { ...search, from: iss.peakAt, to: iss.peakAt + 60_000 };

    test('then it includes that pass', () => {
      expect(findPasses(orbitFor(25544), midPass)).toHaveLength(1);
    });

    test('then the pass rises when Skyfield says it does', () => {
      expect(Math.abs(findPasses(orbitFor(25544), midPass)[0]!.riseAt - iss.riseAt)).toBeLessThan(
        2_000,
      );
    });
  });

  describe('given a search window between two ISS passes', () => {
    test('then it returns nothing', () => {
      const gap = {
        ...search,
        from: ISS_PASSES[0]!.setAt + 60_000,
        to: ISS_PASSES[1]!.riseAt - 60_000,
      };

      expect(findPasses(orbitFor(25544), gap)).toEqual([]);
    });
  });
});

describe('canReachObserver', () => {
  describe('given an equatorial low orbit', () => {
    test('then it never rises over London', () => {
      const equatorial = { ...orbitFor(25544), inclination: 5, apogeeKm: 500 };

      expect(canReachObserver(equatorial, london, 10)).toBe(false);
    });
  });

  describe('given the ISS’s orbit', () => {
    test('then it reaches London', () => {
      expect(canReachObserver(orbitFor(25544), london, 10)).toBe(true);
    });
  });

  describe('given a geostationary orbit', () => {
    test('then it reaches London despite its low inclination', () => {
      const geostationary = { ...orbitFor(25544), inclination: 0, apogeeKm: 35_786 };

      expect(canReachObserver(geostationary, london, 10)).toBe(true);
    });
  });
});

describe('apogeeAltitudeKm', () => {
  describe('given a mean motion of about 15.5 revolutions a day', () => {
    test('then it is a low orbit near 420 km', () => {
      expect(apogeeAltitudeKm(15.5, 0.0005)).toBeGreaterThan(380);
      expect(apogeeAltitudeKm(15.5, 0.0005)).toBeLessThan(440);
    });
  });

  describe('given one revolution a day', () => {
    test('then it is geostationary', () => {
      expect(apogeeAltitudeKm(1.0027, 0)).toBeCloseTo(35_786, -2);
    });
  });
});

describe('perigeeAltitudeKm', () => {
  describe('given an eccentric orbit', () => {
    test('then the perigee is well below the apogee', () => {
      expect(perigeeAltitudeKm(14.13, 0.054)).toBeLessThan(apogeeAltitudeKm(14.13, 0.054) - 500);
    });
  });

  describe('given a circular orbit', () => {
    test('then the perigee equals the apogee', () => {
      expect(perigeeAltitudeKm(15.5, 0)).toBeCloseTo(apogeeAltitudeKm(15.5, 0), 6);
    });
  });
});

describe('periodMinutes', () => {
  describe('given the ISS’s mean motion', () => {
    test('then it goes round in about 93 minutes', () => {
      expect(periodMinutes(15.5)).toBeCloseTo(92.9, 1);
    });
  });
});
