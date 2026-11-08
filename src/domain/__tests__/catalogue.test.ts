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

describe('rarityFor', () => {
  test.each<[string, RarityInput, string]>([
    ['launched before 1980', { ...payload, launchDate: '1963-11-27' }, 'legendary'],
    [
      'an old rocket body',
      { ...payload, objectType: 'rocket_body', launchDate: '1975-01-01' },
      'legendary',
    ],
    ['launched on 1 January 1980', { ...payload, launchDate: '1980-01-01' }, 'uncommon'],
    ['a rocket body', { ...payload, name: 'SL-16 R/B', objectType: 'rocket_body' }, 'rare'],
    ['a named mission', payload, 'uncommon'],
    ['a constellation member', { ...payload, name: 'SPACEMOBILE-003' }, 'common'],
    ['a numbered COSMOS satellite', { ...payload, name: 'COSMOS 2550' }, 'common'],
    ['a space station', { ...payload, name: 'ISS (ZARYA)', isStation: true }, 'common'],
    ['debris', { ...payload, name: 'FREGAT DEB', objectType: 'debris' }, 'common'],
    ['an unknown launch date', { ...payload, launchDate: null }, 'uncommon'],
  ])('%s is %s', (_, input, expected) => {
    expect(rarityFor(input)).toBe(expected);
  });
});

describe('isConstellationMember', () => {
  test.each([
    ['STARLINK-1234', true],
    ['COSMOS 1536', true],
    ['IRIDIUM 33', true],
    ['INTERCOSMOS 24', false],
    ['COSMO-SKYMED 1', false],
    ['HST', false],
  ])('%s → %s', (name, expected) => {
    expect(isConstellationMember(name)).toBe(expected);
  });
});

describe('objectTypeFromSatcat', () => {
  test.each([
    ['PAY', 'payload'],
    ['R/B', 'rocket_body'],
    ['DEB', 'debris'],
    ['UNK', 'unknown'],
    ['', 'unknown'],
  ])('%s → %s', (code, expected) => {
    expect(objectTypeFromSatcat(code)).toBe(expected);
  });
});

describe('catalogueEntryFromSatcat', () => {
  test('maps a SATCAT record and computes its rarity', () => {
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
    });
  });

  test('treats an empty launch date as unknown', () => {
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

describe('ommEpochToMillis', () => {
  test('reads CelesTrak epochs as UTC, keeping milliseconds', () => {
    expect(ommEpochToMillis('2026-11-08T05:26:47.751648')).toBe(
      Date.UTC(2026, 10, 8, 5, 26, 47, 752),
    );
  });

  test('accepts epochs without a fraction or with a Z suffix', () => {
    expect(ommEpochToMillis('2026-11-08T05:26:47')).toBe(Date.UTC(2026, 10, 8, 5, 26, 47));
    expect(ommEpochToMillis('2026-11-08T05:26:47.5Z')).toBe(Date.UTC(2026, 10, 8, 5, 26, 47, 500));
  });

  test('rejects anything else', () => {
    expect(() => ommEpochToMillis('8 Nov 2026')).toThrow('Unrecognised OMM epoch');
  });
});
