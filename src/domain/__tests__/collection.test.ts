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

  test('the first verified sighting catches a satellite', () => {
    const collection = deriveCollection(satellites, [
      { noradId: 25544, observedAt: T + 5_000, verified: true },
      { noradId: 25544, observedAt: T, verified: true },
      { noradId: 25544, observedAt: T - 5_000, verified: false },
    ]);
    const stations = collection.sets.find((set) => set.id === 'spaceStations')!;
    const iss = stations.cards.find((card) => card.noradId === 25544)!;

    expect(iss).toMatchObject({ caughtAt: T, sightingCount: 3 });
    expect(stations).toMatchObject({ caught: 1, total: 2 });
    expect(collection.caught).toBe(1);
  });

  test('unverified sightings are logged but never catch', () => {
    const collection = deriveCollection(satellites, [
      { noradId: 20580, observedAt: T, verified: false },
    ]);
    const hubble = collection.sets
      .find((set) => set.id === 'observatories')!
      .cards.find((card) => card.noradId === 20580)!;

    expect(hubble).toMatchObject({ caughtAt: null, sightingCount: 1 });
    expect(collection.caught).toBe(0);
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
    const collection = deriveCollection(satellites, [
      { noradId: 1, observedAt: T, verified: true },
    ]);

    expect(collection.caught).toBe(0);
  });
});
