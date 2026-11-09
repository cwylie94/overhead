import {
  catalogueEntryFromSatcat,
  isConstellationMember,
  objectTypeFromSatcat,
  ommEpochToMillis,
  rarityFor,
  type RarityInput,
} from '../catalogue';

const payload: RarityInput = {
  name: 'HST',
  objectType: 'payload',
  launchDate: '1990-04-24',
  isStation: false,
};

const rocketBody: RarityInput = {
  name: 'SL-16 R/B',
  objectType: 'rocket_body',
  launchDate: '1990-01-01',
  isStation: false,
};

const SATELLITES: { satellite: string; input: RarityInput; expected: string }[] = [
  {
    satellite: 'a payload launched before 1980',
    input: { ...payload, launchDate: '1963-11-27' },
    expected: 'legendary',
  },
  {
    satellite: 'an old rocket body',
    input: { ...payload, objectType: 'rocket_body', launchDate: '1975-01-01' },
    expected: 'legendary',
  },
  {
    satellite: 'a payload launched on 1 January 1980',
    input: { ...payload, launchDate: '1980-01-01' },
    expected: 'rare',
  },
  { satellite: 'a named mission', input: payload, expected: 'rare' },
  {
    satellite: 'a named mission with an unknown launch date',
    input: { ...payload, launchDate: null },
    expected: 'rare',
  },
  {
    satellite: 'a Cold War-era rocket body',
    input: { ...rocketBody, launchDate: '1999-12-31' },
    expected: 'uncommon',
  },
  {
    satellite: 'a modern rocket body',
    input: { ...rocketBody, launchDate: '2000-01-01' },
    expected: 'common',
  },
  {
    satellite: 'a rocket body with an unknown launch date',
    input: { ...rocketBody, launchDate: null },
    expected: 'common',
  },
  {
    satellite: 'a constellation member',
    input: { ...payload, name: 'SPACEMOBILE-003' },
    expected: 'common',
  },
  {
    satellite: 'a numbered COSMOS satellite',
    input: { ...payload, name: 'COSMOS 2550' },
    expected: 'common',
  },
  {
    satellite: 'a space station',
    input: { ...payload, name: 'ISS (ZARYA)', isStation: true },
    expected: 'common',
  },
  {
    satellite: 'a piece of debris',
    input: { ...payload, name: 'FREGAT DEB', objectType: 'debris' },
    expected: 'common',
  },
];

describe('rarityFor', () => {
  describe.each(SATELLITES)('given $satellite', ({ input, expected }) => {
    test(`then it is ${expected}`, () => {
      expect(rarityFor(input)).toBe(expected);
    });
  });
});

describe('isConstellationMember', () => {
  describe('given the name of a constellation satellite', () => {
    test.each([{ name: 'STARLINK-1234' }, { name: 'COSMOS 1536' }, { name: 'IRIDIUM 33' }])(
      'then $name is a constellation member',
      ({ name }) => {
        expect(isConstellationMember(name)).toBe(true);
      },
    );
  });

  describe('given any other name, even a similar one', () => {
    test.each([{ name: 'INTERCOSMOS 24' }, { name: 'COSMO-SKYMED 1' }, { name: 'HST' }])(
      'then $name is not a constellation member',
      ({ name }) => {
        expect(isConstellationMember(name)).toBe(false);
      },
    );
  });
});

describe('objectTypeFromSatcat', () => {
  describe('given a known SATCAT object type', () => {
    test.each([
      { code: 'PAY', expected: 'payload' },
      { code: 'R/B', expected: 'rocket_body' },
      { code: 'DEB', expected: 'debris' },
    ])('then $code is $expected', ({ code, expected }) => {
      expect(objectTypeFromSatcat(code)).toBe(expected);
    });
  });

  describe('given an unknown or missing SATCAT object type', () => {
    test.each(['UNK', ''])('then %p is unknown', (code) => {
      expect(objectTypeFromSatcat(code)).toBe('unknown');
    });
  });
});

describe('catalogueEntryFromSatcat', () => {
  describe('given the SATCAT record for ATLAS CENTAUR 2', () => {
    test('then it maps the record and works out its rarity, set and magnitude', () => {
      expect(
        catalogueEntryFromSatcat(
          {
            OBJECT_NAME: 'ATLAS CENTAUR 2',
            OBJECT_ID: '1963-047A',
            NORAD_CAT_ID: 694,
            OBJECT_TYPE: 'PAY',
            OWNER: 'US',
            LAUNCH_DATE: '1963-11-27',
          },
          false,
        ),
      ).toEqual({
        noradId: 694,
        name: 'ATLAS CENTAUR 2',
        objectType: 'payload',
        owner: 'US',
        launchDate: '1963-11-27',
        rarity: 'legendary',
        collectionSet: 'coldWarVeterans',
        standardMagnitude: 3.39,
      });
    });
  });

  describe('given a SATCAT record with an empty launch date', () => {
    test('then the launch date is unknown', () => {
      const entry = catalogueEntryFromSatcat(
        {
          OBJECT_NAME: 'MYSTERY',
          OBJECT_ID: '',
          NORAD_CAT_ID: 1,
          OBJECT_TYPE: 'UNK',
          OWNER: 'TBD',
          LAUNCH_DATE: '',
        },
        false,
      );

      expect(entry.launchDate).toBeNull();
    });
  });
});

describe('ommEpochToMillis', () => {
  describe('given a CelesTrak epoch with microseconds', () => {
    test('then it reads it as UTC, keeping milliseconds', () => {
      expect(ommEpochToMillis('2026-11-08T05:26:47.751648')).toBe(
        Date.UTC(2026, 10, 8, 5, 26, 47, 752),
      );
    });
  });

  describe('given an epoch without a fraction', () => {
    test('then it reads it to the second', () => {
      expect(ommEpochToMillis('2026-11-08T05:26:47')).toBe(Date.UTC(2026, 10, 8, 5, 26, 47));
    });
  });

  describe('given an epoch with a Z suffix', () => {
    test('then it reads it as UTC', () => {
      expect(ommEpochToMillis('2026-11-08T05:26:47.5Z')).toBe(
        Date.UTC(2026, 10, 8, 5, 26, 47, 500),
      );
    });
  });

  describe('given a date in any other format', () => {
    test('then it rejects it', () => {
      expect(() => ommEpochToMillis('8 Nov 2026')).toThrow('Unrecognised OMM epoch');
    });
  });
});
