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

const ISS = { name: 'ISS (ZARYA)', rcs: 399, objectType: 'payload', isStation: true } as const;
const HUBBLE = { name: 'HST', rcs: 28, objectType: 'payload', isStation: false } as const;

const ONE_NIGHT_OVER_LONDON = {
  observer: london,
  from: skyfield.window.start,
  to: skyfield.window.end,
  minElevation: 10,
};

const rcsOf = (noradId: number) => satcat.find((record) => record.NORAD_CAT_ID === noradId)!.RCS;
const payloadOfSize = (rcs: number) =>
  standardMagnitude({ name: 'X', rcs, objectType: 'payload', isStation: false });

describe('standardMagnitude', () => {
  describe('given the radar cross-sections of the ISS and Hubble', () => {
    test('then the ISS is about magnitude −1', () => {
      expect(standardMagnitude(ISS)).toBeCloseTo(-1, 1);
    });

    test('then Hubble is about magnitude 1.9', () => {
      expect(standardMagnitude(HUBBLE)).toBeCloseTo(1.9, 1);
    });

    test('then the bigger ISS is brighter', () => {
      expect(standardMagnitude(ISS)).toBeLessThan(standardMagnitude(HUBBLE));
    });
  });

  describe('given an object with no cross-section in the catalogue', () => {
    test('then a rocket body falls back to the typical rocket body size', () => {
      expect(
        standardMagnitude({
          name: 'CZ-2C R/B',
          rcs: null,
          objectType: 'rocket_body',
          isStation: false,
        }),
      ).toBe(payloadOfSize(TYPICAL_RCS.rocket_body));
    });

    test('then a station module falls back to the station size', () => {
      expect(
        standardMagnitude({
          name: 'CSS (TIANHE)',
          rcs: null,
          objectType: 'payload',
          isStation: true,
        }),
      ).toBe(payloadOfSize(STATION_RCS));
    });
  });

  describe('given a CubeSat or crew craft from the stations group with no cross-section', () => {
    test.each([{ name: 'DUPLEX' }, { name: 'SOYUZ-MS 29' }, { name: 'CREW DRAGON 13' }])(
      'then $name gets the typical payload size',
      ({ name }) => {
        expect(standardMagnitude({ name, rcs: null, objectType: 'payload', isStation: true })).toBe(
          standardMagnitude({
            name: 'X',
            rcs: TYPICAL_RCS.payload,
            objectType: 'payload',
            isStation: false,
          }),
        );
      },
    );
  });
});

describe('apparentMagnitude', () => {
  describe('given a standard magnitude of 2', () => {
    test('then at 1000 km and a right-angle phase it equals the standard magnitude', () => {
      expect(apparentMagnitude(2, 1_000, RIGHT_ANGLE)).toBeCloseTo(2, 9);
    });

    test('then halving the distance brightens it by about 1.5 magnitudes', () => {
      expect(apparentMagnitude(2, 500, RIGHT_ANGLE)).toBeCloseTo(2 - 1.505, 3);
    });

    test('then a fully lit face is brighter than a half lit one', () => {
      expect(apparentMagnitude(2, 1_000, 0)).toBeCloseTo(2 - 2.5 * Math.log10(Math.PI), 6);
    });

    test('then a back-lit face is very faint', () => {
      expect(apparentMagnitude(2, 1_000, Math.PI * 0.95)).toBeGreaterThan(7);
    });
  });

  describe('given the ISS overhead with the Sun behind the observer', () => {
    test('then it is brilliant', () => {
      expect(apparentMagnitude(standardMagnitude(ISS), 420, (30 * Math.PI) / 180)).toBeLessThan(-3);
    });
  });
});

describe('phaseAngle', () => {
  describe('given a satellite straight above the observer', () => {
    const satellite = { x: 0, y: 0, z: 7000 };
    const observer = { x: 0, y: 0, z: 6400 };

    test('then it is zero with the Sun directly behind the observer', () => {
      expect(phaseAngle(satellite, observer, { x: 0, y: 0, z: -1e8 })).toBeCloseTo(0, 6);
    });

    test('then it is a right angle with the Sun side-on', () => {
      expect(phaseAngle(satellite, observer, { x: 1e8, y: 0, z: 7000 })).toBeCloseTo(
        RIGHT_ANGLE,
        6,
      );
    });
  });
});

describe('brightnessTier', () => {
  describe('given a magnitude', () => {
    test.each([
      { magnitude: -3.5, expected: 'brilliant' },
      { magnitude: 1, expected: 'brilliant' },
      { magnitude: 1.1, expected: 'bright' },
      { magnitude: 3, expected: 'bright' },
      { magnitude: 3.1, expected: 'faint' },
      { magnitude: 5, expected: 'faint' },
    ])('then magnitude $magnitude is $expected', ({ magnitude, expected }) => {
      expect(brightnessTier(magnitude)).toBe(expected);
    });
  });
});

describe('isNakedEye', () => {
  describe('given a magnitude at the naked-eye limit', () => {
    test('then it is visible to the naked eye', () => {
      expect(isNakedEye(4.5)).toBe(true);
    });
  });

  describe('given a magnitude just past the naked-eye limit', () => {
    test('then it is not visible to the naked eye', () => {
      expect(isNakedEye(4.6)).toBe(false);
    });
  });
});

describe('findPasses', () => {
  describe('given Hubble with no standard magnitude', () => {
    test('then none of its passes has a peak magnitude', () => {
      expect(
        findPasses(orbitFor(20580), ONE_NIGHT_OVER_LONDON).every(
          (pass) => pass.peakMagnitude === null,
        ),
      ).toBe(true);
    });
  });

  describe('given Hubble with a standard magnitude', () => {
    test('then only its visible passes have a peak magnitude', () => {
      for (const pass of findPasses(orbitFor(20580), ONE_NIGHT_OVER_LONDON, 1.9)) {
        expect(pass.peakMagnitude === null).toBe(pass.visible.length === 0);
      }
    });
  });

  describe('given Hubble and two rocket bodies sized from the catalogue', () => {
    let magnitudes: number[];

    beforeEach(() => {
      magnitudes = [20580, 22566, 694].flatMap((noradId) => {
        const standard = standardMagnitude({
          name: String(noradId),
          rcs: rcsOf(noradId),
          objectType: noradId === 20580 ? 'payload' : 'rocket_body',
          isStation: false,
        });
        return findPasses(orbitFor(noradId), ONE_NIGHT_OVER_LONDON, standard).flatMap((pass) =>
          pass.peakMagnitude === null ? [] : [pass.peakMagnitude],
        );
      });
    });

    test('then more than three of their passes are visible', () => {
      expect(magnitudes.length).toBeGreaterThan(3);
    });

    test('then their visible passes are in a plausible naked-eye range', () => {
      expect(Math.min(...magnitudes)).toBeGreaterThan(-2);
      expect(Math.max(...magnitudes)).toBeLessThan(7);
    });
  });
});
