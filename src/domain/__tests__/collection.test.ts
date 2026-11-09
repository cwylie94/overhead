import { caughtIds, deriveCollection, type CollectableSatellite } from '../collection';

const CATALOGUE: CollectableSatellite[] = [
  {
    noradId: 25544,
    name: 'ISS (ZARYA)',
    objectType: 'payload',
    rarity: 'common',
    collectionSet: 'spaceStations',
  },
  {
    noradId: 48274,
    name: 'CSS (TIANHE)',
    objectType: 'payload',
    rarity: 'common',
    collectionSet: 'spaceStations',
  },
  {
    noradId: 20580,
    name: 'HST',
    objectType: 'payload',
    rarity: 'rare',
    collectionSet: 'observatories',
  },
  {
    noradId: 3597,
    name: 'OAO 2',
    objectType: 'payload',
    rarity: 'legendary',
    collectionSet: 'observatories',
  },
  {
    noradId: 694,
    name: 'ATLAS CENTAUR 2',
    objectType: 'rocket_body',
    rarity: 'legendary',
    collectionSet: 'coldWarVeterans',
  },
];

const CATALOGUE_WITH_DOCKED_MODULES: CollectableSatellite[] = [
  ...CATALOGUE,
  {
    noradId: 49044,
    name: 'ISS (NAUKA)',
    objectType: 'payload',
    rarity: 'common',
    collectionSet: 'spaceStations',
  },
  {
    noradId: 36086,
    name: 'POISK',
    objectType: 'payload',
    rarity: 'common',
    collectionSet: 'spaceStations',
  },
];
const DOCKED = new Set([49044, 36086]);

const T = Date.UTC(2026, 10, 8, 21);

const ISS_SIGHTINGS_OUT_OF_ORDER = [
  { noradId: 25544, observedAt: T + 5_000 },
  { noradId: 25544, observedAt: T },
  { noradId: 25544, observedAt: T - 5_000 },
];

describe('deriveCollection', () => {
  describe('given an empty log', () => {
    test('then nothing is caught out of all five satellites', () => {
      expect(deriveCollection(CATALOGUE, [])).toMatchObject({ caught: 0, total: 5 });
    });

    test('then every card is still to catch', () => {
      expect(
        deriveCollection(CATALOGUE, [])
          .sets.flatMap((set) => set.cards)
          .every((card) => card.caughtAt === null),
      ).toBe(true);
    });

    test('then the sets keep the defined order and skip empty ones', () => {
      expect(deriveCollection(CATALOGUE, []).sets.map((set) => set.id)).toEqual([
        'spaceStations',
        'observatories',
        'coldWarVeterans',
      ]);
    });

    test('then cards of the same rarity are sorted by name', () => {
      expect(deriveCollection(CATALOGUE, []).sets[0]!.cards.map((card) => card.name)).toEqual([
        'CSS (TIANHE)',
        'ISS (ZARYA)',
      ]);
    });

    test('then rarer cards come before commoner ones', () => {
      expect(deriveCollection(CATALOGUE, []).sets[1]!.cards.map((card) => card.name)).toEqual([
        'OAO 2',
        'HST',
      ]);
    });
  });

  describe('given three sightings of the ISS logged out of order', () => {
    const stationsIn = (collection: ReturnType<typeof deriveCollection>) =>
      collection.sets.find((set) => set.id === 'spaceStations')!;

    test('then the ISS is caught at its earliest sighting, with every sighting counted', () => {
      const iss = stationsIn(deriveCollection(CATALOGUE, ISS_SIGHTINGS_OUT_OF_ORDER)).cards.find(
        (card) => card.noradId === 25544,
      )!;

      expect(iss).toMatchObject({ caughtAt: T - 5_000, sightingCount: 3 });
    });

    test('then the space stations set has one of its two caught', () => {
      expect(stationsIn(deriveCollection(CATALOGUE, ISS_SIGHTINGS_OUT_OF_ORDER))).toMatchObject({
        caught: 1,
        total: 2,
      });
    });

    test('then the collection has one caught', () => {
      expect(deriveCollection(CATALOGUE, ISS_SIGHTINGS_OUT_OF_ORDER).caught).toBe(1);
    });
  });

  describe('given a sighting of OAO 2', () => {
    test('then each rarity counts its progress across the sets', () => {
      expect(deriveCollection(CATALOGUE, [{ noradId: 3597, observedAt: T }]).rarities).toEqual([
        { id: 'legendary', caught: 1, total: 2 },
        { id: 'rare', caught: 0, total: 1 },
        { id: 'uncommon', caught: 0, total: 0 },
        { id: 'common', caught: 0, total: 2 },
      ]);
    });
  });

  describe('given a sighting of a satellite outside the catalogue', () => {
    test('then it is ignored', () => {
      expect(deriveCollection(CATALOGUE, [{ noradId: 1, observedAt: T }]).caught).toBe(0);
    });
  });

  describe('given two docked modules, of which only POISK was already seen', () => {
    const collection = () =>
      deriveCollection(CATALOGUE_WITH_DOCKED_MODULES, [{ noradId: 36086, observedAt: T }], DOCKED);

    test('then the space stations set leaves out the module that was never seen', () => {
      expect(collection().sets[0]!.cards.map((card) => card.name)).toEqual([
        'CSS (TIANHE)',
        'ISS (ZARYA)',
        'POISK',
      ]);
    });

    test('then the total counts the module that was seen', () => {
      expect(collection().total).toBe(6);
    });
  });
});

describe('caughtIds', () => {
  describe('given the ISS was caught three times and a docked module once', () => {
    test('then it lists each caught satellite once', () => {
      const collection = deriveCollection(
        CATALOGUE_WITH_DOCKED_MODULES,
        [...ISS_SIGHTINGS_OUT_OF_ORDER, { noradId: 36086, observedAt: T }],
        DOCKED,
      );
      expect(caughtIds(collection)).toEqual(new Set([25544, 36086]));
    });
  });
});
