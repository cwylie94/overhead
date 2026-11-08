import satcat from '@/data/snapshot/satcat.json';

import {
  apparentMagnitude,
  brightnessTier,
  isNakedEye,
  phaseAngle,
  standardMagnitude,
  STATION_RCS,
  TYPICAL_RCS,
} from '../brightness';
import { findPasses } from '../passFinder';
import { london, orbitFor, skyfield } from '../testing/skyfieldFixture';

const RIGHT_ANGLE = Math.PI / 2;

describe('standardMagnitude', () => {
  test('bigger objects are brighter', () => {
    const iss = standardMagnitude({
      name: 'ISS (ZARYA)',
      rcs: 399,
      objectType: 'payload',
      isStation: true,
    });
    const hubble = standardMagnitude({
      name: 'HST',
      rcs: 28,
      objectType: 'payload',
      isStation: false,
    });

    expect(iss).toBeCloseTo(-1, 1);
    expect(hubble).toBeCloseTo(1.9, 1);
    expect(iss).toBeLessThan(hubble);
  });

  test('falls back to a typical size when the catalogue has no cross-section', () => {
    const sized = (rcs: number) =>
      standardMagnitude({ name: 'X', rcs, objectType: 'payload', isStation: false });

    expect(
      standardMagnitude({
        name: 'CZ-2C R/B',
        rcs: null,
        objectType: 'rocket_body',
        isStation: false,
      }),
    ).toBe(sized(TYPICAL_RCS.rocket_body));
    expect(
      standardMagnitude({
        name: 'CSS (TIANHE)',
        rcs: null,
        objectType: 'payload',
        isStation: true,
      }),
    ).toBe(sized(STATION_RCS));
  });

  test('cubesats and crew craft from the stations group get the typical payload size', () => {
    for (const name of ['DUPLEX', 'SOYUZ-MS 29', 'CREW DRAGON 13']) {
      expect(standardMagnitude({ name, rcs: null, objectType: 'payload', isStation: true })).toBe(
        standardMagnitude({
          name: 'X',
          rcs: TYPICAL_RCS.payload,
          objectType: 'payload',
          isStation: false,
        }),
      );
    }
  });
});

describe('apparentMagnitude', () => {
  test('equals the standard magnitude at 1000 km and a right-angle phase', () => {
    expect(apparentMagnitude(2, 1_000, RIGHT_ANGLE)).toBeCloseTo(2, 9);
  });

  test('halving the distance brightens by about 1.5 magnitudes', () => {
    expect(apparentMagnitude(2, 500, RIGHT_ANGLE)).toBeCloseTo(2 - 1.505, 3);
  });

  test('a fully lit face is brighter than a half lit one, and a back-lit one is very faint', () => {
    expect(apparentMagnitude(2, 1_000, 0)).toBeCloseTo(2 - 2.5 * Math.log10(Math.PI), 6);
    expect(apparentMagnitude(2, 1_000, Math.PI * 0.95)).toBeGreaterThan(7);
  });

  test('the ISS overhead with the sun behind the observer is brilliant', () => {
    const iss = standardMagnitude({
      name: 'ISS (ZARYA)',
      rcs: 399,
      objectType: 'payload',
      isStation: true,
    });

    expect(apparentMagnitude(iss, 420, (30 * Math.PI) / 180)).toBeLessThan(-3);
  });
});

describe('phaseAngle', () => {
  test('is zero with the sun directly behind the observer and a right angle side-on', () => {
    const satellite = { x: 0, y: 0, z: 7000 };

    expect(phaseAngle(satellite, { x: 0, y: 0, z: 6400 }, { x: 0, y: 0, z: -1e8 })).toBeCloseTo(
      0,
      6,
    );
    expect(phaseAngle(satellite, { x: 0, y: 0, z: 6400 }, { x: 1e8, y: 0, z: 7000 })).toBeCloseTo(
      RIGHT_ANGLE,
      6,
    );
  });
});

describe('brightnessTier', () => {
  test.each([
    [-3.5, 'brilliant'],
    [1, 'brilliant'],
    [1.1, 'bright'],
    [3, 'bright'],
    [3.1, 'faint'],
    [5, 'faint'],
  ])('magnitude %d is %s', (magnitude, expected) => {
    expect(brightnessTier(magnitude)).toBe(expected);
  });

  test.each([
    [4.5, true],
    [4.6, false],
  ])('magnitude %d naked-eye visible: %s', (magnitude, expected) => {
    expect(isNakedEye(magnitude)).toBe(expected);
  });
});

describe('pass brightness', () => {
  const search = {
    observer: london,
    from: skyfield.window.start,
    to: skyfield.window.end,
    minElevation: 10,
  };
  const rcsOf = (noradId: number) => satcat.find((record) => record.NORAD_CAT_ID === noradId)!.RCS;

  test('is only estimated for visible passes of satellites with a standard magnitude', () => {
    const hubble = orbitFor(20580);
    const withMagnitude = findPasses(hubble, search, 1.9);
    const without = findPasses(hubble, search);

    expect(without.every((pass) => pass.peakMagnitude === null)).toBe(true);
    for (const pass of withMagnitude) {
      expect(pass.peakMagnitude === null).toBe(pass.visible.length === 0);
    }
  });

  test('puts real visible passes in a plausible naked-eye range', () => {
    const magnitudes = [20580, 22566, 694].flatMap((noradId) => {
      const standard = standardMagnitude({
        name: String(noradId),
        rcs: rcsOf(noradId),
        objectType: noradId === 20580 ? 'payload' : 'rocket_body',
        isStation: false,
      });
      return findPasses(orbitFor(noradId), search, standard).flatMap((pass) =>
        pass.peakMagnitude === null ? [] : [pass.peakMagnitude],
      );
    });

    expect(magnitudes.length).toBeGreaterThan(3);
    expect(Math.min(...magnitudes)).toBeGreaterThan(-2);
    expect(Math.max(...magnitudes)).toBeLessThan(7);
  });
});
