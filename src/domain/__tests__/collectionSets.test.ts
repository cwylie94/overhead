import satcat from '@/data/snapshot/satcat.json';

import {
  collectionSetFor,
  EARTH_WATCHERS,
  OBSERVATORIES,
  type CollectionSetInput,
} from '../collectionSets';

const base: CollectionSetInput = {
  noradId: 99999,
  name: 'SOMESAT',
  objectType: 'payload',
  launchDate: '2010-01-01',
  isStation: false,
};

describe('collectionSetFor', () => {
  test.each<[string, Partial<CollectionSetInput>, string]>([
    [
      'anything in the stations group',
      { isStation: true, launchDate: '1970-01-01' },
      'spaceStations',
    ],
    [
      'a listed observatory, even a Cold War one',
      { noradId: 3597, launchDate: '1968-12-07' },
      'observatories',
    ],
    ['a listed Earth watcher', { noradId: 25994 }, 'earthWatchers'],
    ['a payload launched in 1991', { launchDate: '1991-12-31' }, 'coldWarVeterans'],
    [
      'a rocket body launched in 1988',
      { objectType: 'rocket_body', launchDate: '1988-05-01' },
      'coldWarVeterans',
    ],
    [
      'a rocket body launched in 1992',
      { objectType: 'rocket_body', launchDate: '1992-01-01' },
      'spentStages',
    ],
    ['a piece of debris after 1992', { objectType: 'debris', name: 'FREGAT DEB' }, 'spentStages'],
    ['a commercial constellation member', { name: 'SPACEMOBILE-003' }, 'constellations'],
    ['a military COSMOS satellite', { name: 'COSMOS 2550' }, 'spiesAndSecrets'],
    ['a Yaogan satellite', { name: 'YAOGAN-29' }, 'spiesAndSecrets'],
    ['anything else after 1992', {}, 'spiesAndSecrets'],
    ['a payload with no launch date', { launchDate: null }, 'spiesAndSecrets'],
  ])('%s goes in %s', (_, overrides, expected) => {
    expect(collectionSetFor({ ...base, ...overrides })).toBe(expected);
  });
});

describe('curated sets', () => {
  const names = new Map(satcat.map((record) => [record.NORAD_CAT_ID, record.OBJECT_NAME]));

  test.each([
    ['observatories', OBSERVATORIES],
    ['Earth watchers', EARTH_WATCHERS],
  ])('every listed %s is in the bundled catalogue under the same name', (_, list) => {
    const mismatched = Object.entries(list).filter(([id, name]) => names.get(Number(id)) !== name);

    expect(mismatched).toEqual([]);
  });
});
