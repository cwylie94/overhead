import { apogeeAltitudeKm } from '../orbit';
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

describe('findPasses against Skyfield', () => {
  const pairs = skyfield.passes.map((expected) => ({ expected, actual: matching(expected) }));

  test('finds every pass Skyfield finds', () => {
    expect(pairs.filter(({ actual }) => !actual).map(({ expected }) => expected)).toEqual([]);
  });

  test('finds no passes Skyfield does not', () => {
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

  test('rise and set times agree within 2 seconds', () => {
    expect(
      worst(pairs.map(({ expected, actual }) => actual!.riseAt - expected.riseAt)),
    ).toBeLessThan(2_000);
    expect(worst(pairs.map(({ expected, actual }) => actual!.setAt - expected.setAt))).toBeLessThan(
      2_000,
    );
  });

  test('peak times agree within 5 seconds', () => {
    expect(
      worst(pairs.map(({ expected, actual }) => actual!.peakAt - expected.peakAt)),
    ).toBeLessThan(5_000);
  });

  test('peak elevations agree within 0.02 degrees, or 0.1 degrees near the zenith', () => {
    const [nearZenith, elsewhere] = [
      pairs.filter(({ expected }) => expected.maxElevation >= 85),
      pairs.filter(({ expected }) => expected.maxElevation < 85),
    ];
    const elevationError = ({ expected, actual }: (typeof pairs)[number]) =>
      actual!.maxElevation - expected.maxElevation;

    expect(worst(elsewhere.map(elevationError))).toBeLessThan(0.02);
    expect(worst(nearZenith.map(elevationError))).toBeLessThan(0.1);
  });

  test('every visible part longer than the minimum matches within 2 seconds', () => {
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

    expect(unmatched).toEqual([]);
    expect(differences.length).toBeGreaterThan(500);
    expect(worst(differences)).toBeLessThan(2_000);
  });

  test('drops visible parts too short to catch anything', () => {
    const parts = found.flatMap((pass) => pass.visible);

    expect(parts.every(({ startAt, endAt }) => endAt - startAt >= MIN_VISIBLE_DURATION)).toBe(true);
  });
});

describe('pass tracks', () => {
  const pass = found.find((p) => p.noradId === 25544 && p.maxElevation > 60)!;

  test('start at the rise, end at the set and step every 10 seconds', () => {
    expect(pass.track[0]!.time).toBe(pass.riseAt);
    expect(pass.track[pass.track.length - 1]!.time).toBe(pass.setAt);
    expect(pass.track[1]!.time - pass.track[0]!.time).toBe(10_000);
  });

  test('stay above the horizon and peak near the maximum elevation', () => {
    const elevations = pass.track.map((point) => point.elevation);

    expect(Math.min(...elevations)).toBeGreaterThan(skyfield.minElevation - 0.1);
    expect(Math.max(...elevations)).toBeCloseTo(pass.maxElevation, 0);
  });
});

describe('search window', () => {
  test('includes a pass already in progress when the window opens', () => {
    const iss = skyfield.passes.find((p) => p.noradId === 25544)!;
    const midPass = { ...search, from: iss.peakAt, to: iss.peakAt + 60_000 };

    const passes = findPasses(orbitFor(25544), midPass);

    expect(passes).toHaveLength(1);
    expect(Math.abs(passes[0]!.riseAt - iss.riseAt)).toBeLessThan(2_000);
  });

  test('returns nothing for a window with no passes', () => {
    const iss = skyfield.passes.filter((p) => p.noradId === 25544);
    const gap = { ...search, from: iss[0]!.setAt + 60_000, to: iss[1]!.riseAt - 60_000 };

    expect(findPasses(orbitFor(25544), gap)).toEqual([]);
  });
});

describe('canReachObserver', () => {
  test('an equatorial low orbit never rises over London', () => {
    const equatorial = { ...orbitFor(25544), inclination: 5, apogeeKm: 500 };

    expect(canReachObserver(equatorial, london, 10)).toBe(false);
  });

  test('the ISS reaches London', () => {
    expect(canReachObserver(orbitFor(25544), london, 10)).toBe(true);
  });

  test('a geostationary orbit reaches London despite its low inclination', () => {
    const geostationary = { ...orbitFor(25544), inclination: 0, apogeeKm: 35_786 };

    expect(canReachObserver(geostationary, london, 10)).toBe(true);
  });
});

describe('apogeeAltitudeKm', () => {
  test('a mean motion of about 15.5 revolutions a day is a low orbit near 420 km', () => {
    expect(apogeeAltitudeKm(15.5, 0.0005)).toBeGreaterThan(380);
    expect(apogeeAltitudeKm(15.5, 0.0005)).toBeLessThan(440);
  });

  test('one revolution a day is geostationary', () => {
    expect(apogeeAltitudeKm(1.0027, 0)).toBeCloseTo(35_786, -2);
  });
});
