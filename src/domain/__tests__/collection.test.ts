import { deriveCollection, type CollectableSatellite } from '../collection';

const satellites: CollectableSatellite[] = [
  { noradId: 25544, name: 'ISS (ZARYA)', rarity: 'common', collectionSet: 'spaceStations' },
  { noradId: 48274, name: 'CSS (TIANHE)', rarity: 'common', collectionSet: 'spaceStations' },
  { noradId: 20580, name: 'HST', rarity: 'rare', collectionSet: 'observatories' },
  { noradId: 3597, name: 'OAO 2', rarity: 'legendary', collectionSet: 'observatories' },
  { noradId: 694, name: 'ATLAS CENTAUR 2', rarity: 'legendary', collectionSet: 'coldWarVeterans' },
];

const T = Date.UTC(2026, 10, 8, 21);

describe('deriveCollection', () => {
  test('an empty log catches nothing but lists every satellite', () => {
    const collection = deriveCollection(satellites, []);

    expect(collection).toMatchObject({ caught: 0, total: 5 });
    expect(
      collection.sets.flatMap((set) => set.cards).every((card) => card.caughtAt === null),
    ).toBe(true);
  });

  test('the first sighting catches a satellite', () => {
    const collection = deriveCollection(satellites, [
      { noradId: 25544, observedAt: T + 5_000 },
      { noradId: 25544, observedAt: T },
      { noradId: 25544, observedAt: T - 5_000 },
    ]);
    const stations = collection.sets.find((set) => set.id === 'spaceStations')!;
    const iss = stations.cards.find((card) => card.noradId === 25544)!;

    expect(iss).toMatchObject({ caughtAt: T - 5_000, sightingCount: 3 });
    expect(stations).toMatchObject({ caught: 1, total: 2 });
    expect(collection.caught).toBe(1);
  });

  test('counts progress for each rarity across the sets', () => {
    const collection = deriveCollection(satellites, [{ noradId: 3597, observedAt: T }]);

    expect(collection.rarities).toEqual([
      { id: 'legendary', caught: 1, total: 2 },
      { id: 'rare', caught: 0, total: 1 },
      { id: 'uncommon', caught: 0, total: 0 },
      { id: 'common', caught: 0, total: 2 },
    ]);
  });

  test('sets keep the defined order, skip empty sets and sort cards by rarity then name', () => {
    const collection = deriveCollection(satellites, []);

    expect(collection.sets.map((set) => set.id)).toEqual([
      'spaceStations',
      'observatories',
      'coldWarVeterans',
    ]);
    expect(collection.sets[0]!.cards.map((card) => card.name)).toEqual([
      'CSS (TIANHE)',
      'ISS (ZARYA)',
    ]);
    expect(collection.sets[1]!.cards.map((card) => card.name)).toEqual(['OAO 2', 'HST']);
  });

  test('sightings of satellites outside the catalogue are ignored', () => {
    const collection = deriveCollection(satellites, [{ noradId: 1, observedAt: T }]);

    expect(collection.caught).toBe(0);
  });

  test('leaves out docked modules and visitors unless they were already seen', () => {
    const withModules: CollectableSatellite[] = [
      ...satellites,
      { noradId: 49044, name: 'ISS (NAUKA)', rarity: 'common', collectionSet: 'spaceStations' },
      { noradId: 36086, name: 'POISK', rarity: 'common', collectionSet: 'spaceStations' },
    ];
    const collection = deriveCollection(
      withModules,
      [{ noradId: 36086, observedAt: T }],
      new Set([49044, 36086]),
    );
    const stations = collection.sets[0]!.cards.map((card) => card.name);

    expect(stations).toEqual(['CSS (TIANHE)', 'ISS (ZARYA)', 'POISK']);
    expect(collection.total).toBe(6);
  });
});
