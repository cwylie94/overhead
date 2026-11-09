import satcat from '@/data/snapshot/satcat.json';

import {
  collectionSetFor,
  EARTH_WATCHERS,
  OBSERVATORIES,
  type CollectionSetInput,
} from '../collectionSets';

const ORDINARY_2010_PAYLOAD: CollectionSetInput = {
  noradId: 99999,
  name: 'SOMESAT',
  objectType: 'payload',
  launchDate: '2010-01-01',
  isStation: false,
};

const SATELLITES: {
  satellite: string;
  overrides: Partial<CollectionSetInput>;
  expected: string;
}[] = [
  {
    satellite: 'anything in the stations group',
    overrides: { isStation: true, launchDate: '1970-01-01' },
    expected: 'spaceStations',
  },
  {
    satellite: 'a listed observatory, even a Cold War one',
    overrides: { noradId: 3597, launchDate: '1968-12-07' },
    expected: 'observatories',
  },
  {
    satellite: 'a listed Earth watcher',
    overrides: { noradId: 25994 },
    expected: 'earthWatchers',
  },
  {
    satellite: 'a payload launched in 1991',
    overrides: { launchDate: '1991-12-31' },
    expected: 'coldWarVeterans',
  },
  {
    satellite: 'a rocket body launched in 1988',
    overrides: { objectType: 'rocket_body', launchDate: '1988-05-01' },
    expected: 'coldWarVeterans',
  },
  {
    satellite: 'a rocket body launched in 1992',
    overrides: { objectType: 'rocket_body', launchDate: '1992-01-01' },
    expected: 'spentStages',
  },
  {
    satellite: 'a piece of debris after 1992',
    overrides: { objectType: 'debris', name: 'FREGAT DEB' },
    expected: 'spentStages',
  },
  {
    satellite: 'a commercial constellation member',
    overrides: { name: 'SPACEMOBILE-003' },
    expected: 'constellations',
  },
  {
    satellite: 'a military COSMOS satellite',
    overrides: { name: 'COSMOS 2550' },
    expected: 'spiesAndSecrets',
  },
  {
    satellite: 'a Yaogan satellite',
    overrides: { name: 'YAOGAN-29' },
    expected: 'spiesAndSecrets',
  },
  { satellite: 'anything else after 1992', overrides: {}, expected: 'spiesAndSecrets' },
  {
    satellite: 'a payload with no launch date',
    overrides: { launchDate: null },
    expected: 'spiesAndSecrets',
  },
];

const CATALOGUE_NAMES = new Map(satcat.map((record) => [record.NORAD_CAT_ID, record.OBJECT_NAME]));

describe('collectionSetFor', () => {
  describe.each(SATELLITES)('given $satellite', ({ overrides, expected }) => {
    test(`then it goes in ${expected}`, () => {
      expect(collectionSetFor({ ...ORDINARY_2010_PAYLOAD, ...overrides })).toBe(expected);
    });
  });
});

describe.each([
  { name: 'OBSERVATORIES', list: OBSERVATORIES },
  { name: 'EARTH_WATCHERS', list: EARTH_WATCHERS },
])('$name', ({ list }) => {
  describe('given the bundled catalogue', () => {
    test('then every listed satellite is in it under the same name', () => {
      const mismatched = Object.entries(list).filter(
        ([id, name]) => CATALOGUE_NAMES.get(Number(id)) !== name,
      );

      expect(mismatched).toEqual([]);
    });
  });
});
