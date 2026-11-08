import { ommEpochToMillis } from '@/domain/catalogue';
import { COLLECTION_SETS } from '@/domain/collectionSets';
import { RARITIES } from '@/domain/types';

import type { Database } from '../../database';
import { createRepositories, type Repositories } from '../../repositories';
import { createTestDatabase } from '../../testing/createTestDatabase';
import { HUBBLE_NORAD_ID, ISS_NORAD_ID, makeOmm, makeOrbit } from '../../testing/fixtures';
import { bundledSnapshot, importSnapshot, type Snapshot } from '../index';

const FETCHED_AT = Date.UTC(2026, 10, 8, 16);

const snapshot: Snapshot = {
  fetchedAt: FETCHED_AT,
  groups: {
    visual: [
      makeOmm({ NORAD_CAT_ID: HUBBLE_NORAD_ID, OBJECT_NAME: 'HST' }),
      makeOmm({ NORAD_CAT_ID: ISS_NORAD_ID }),
    ],
    stations: [makeOmm({ NORAD_CAT_ID: ISS_NORAD_ID })],
  },
  satcat: [
    {
      OBJECT_NAME: 'HST',
      OBJECT_ID: '1990-037B',
      NORAD_CAT_ID: HUBBLE_NORAD_ID,
      OBJECT_TYPE: 'PAY',
      OWNER: 'US',
      LAUNCH_DATE: '1990-04-24',
    },
    {
      OBJECT_NAME: 'ISS (ZARYA)',
      OBJECT_ID: '1998-067A',
      NORAD_CAT_ID: ISS_NORAD_ID,
      OBJECT_TYPE: 'PAY',
      OWNER: 'ISS',
      LAUNCH_DATE: '1998-11-20',
    },
  ],
};

let db: Database;
let repositories: Repositories;

beforeEach(() => {
  db = createTestDatabase();
  repositories = createRepositories(db);
});

describe('importSnapshot', () => {
  test('fills an empty database with the catalogue and both orbit groups', () => {
    const result = importSnapshot(repositories, snapshot);

    expect(result).toEqual({ catalogue: true, groups: ['visual', 'stations'] });
    expect(repositories.satellites.getById(HUBBLE_NORAD_ID)?.rarity).toBe('rare');
    expect(repositories.satellites.getById(ISS_NORAD_ID)?.rarity).toBe('common');
    expect(repositories.orbits.listAll()).toHaveLength(2);
    expect(repositories.orbits.getById(HUBBLE_NORAD_ID)).toMatchObject({
      group: 'visual',
      fetchedAt: FETCHED_AT,
      epoch: ommEpochToMillis(snapshot.groups.visual[0]!.EPOCH),
    });
  });

  test('does nothing the second time', () => {
    importSnapshot(repositories, snapshot);

    expect(importSnapshot(repositories, snapshot)).toEqual({ catalogue: false, groups: [] });
  });

  test('a newer bundled snapshot refreshes the catalogue', () => {
    importSnapshot(repositories, snapshot);
    const renamed: Snapshot = {
      ...snapshot,
      fetchedAt: FETCHED_AT + 1,
      satcat: snapshot.satcat.map((record) => ({
        ...record,
        OBJECT_NAME: `${record.OBJECT_NAME}*`,
      })),
    };

    expect(importSnapshot(repositories, renamed).catalogue).toBe(true);
    expect(repositories.satellites.getById(HUBBLE_NORAD_ID)?.name).toBe('HST*');
  });

  test('a change to the rarity rules re-imports the catalogue but not the orbits', () => {
    importSnapshot(repositories, snapshot, 1);

    expect(importSnapshot(repositories, snapshot, 2)).toEqual({ catalogue: true, groups: [] });
    expect(importSnapshot(repositories, snapshot, 2).catalogue).toBe(false);
  });

  test('never replaces orbits that were downloaded after the snapshot', () => {
    repositories.orbits.replaceGroup('stations', [
      makeOrbit({ group: 'stations', epoch: 42, fetchedAt: FETCHED_AT + 60_000 }),
    ]);

    const result = importSnapshot(repositories, snapshot);

    expect(result.groups).toEqual(['visual']);
    expect(repositories.orbits.getById(ISS_NORAD_ID)?.epoch).not.toBe(42);
    expect(repositories.orbits.getById(ISS_NORAD_ID)?.group).toBe('visual');
  });
});

describe('bundled snapshot', () => {
  test('imports completely, with a catalogue entry for every orbit', () => {
    importSnapshot(repositories, bundledSnapshot);

    const satelliteIds = new Set(repositories.satellites.listAll().map((s) => s.noradId));
    const orbits = repositories.orbits.listAll();

    expect(satelliteIds.size).toBe(bundledSnapshot.satcat.length);
    expect(orbits.length).toBeGreaterThan(100);
    expect(orbits.filter((orbit) => !satelliteIds.has(orbit.noradId))).toEqual([]);
    expect(repositories.satellites.getById(ISS_NORAD_ID)?.rarity).toBe('common');
  });

  test('rarities form a pyramid, each tier larger than the one above', () => {
    importSnapshot(repositories, bundledSnapshot);

    const counts = Object.fromEntries(RARITIES.map((rarity) => [rarity, 0]));
    for (const { rarity } of repositories.satellites.listAll()) {
      counts[rarity]! += 1;
    }

    expect(counts.legendary).toBeGreaterThan(0);
    expect(counts.rare).toBeGreaterThan(counts.legendary!);
    expect(counts.uncommon).toBeGreaterThan(counts.rare!);
    expect(counts.common).toBeGreaterThan(counts.uncommon!);
  });
});

describe('bundled collection sets', () => {
  test('every set has members and space stations hold the whole stations group', () => {
    importSnapshot(repositories, bundledSnapshot);

    const counts = new Map<string, number>();
    for (const { collectionSet } of repositories.satellites.listAll()) {
      counts.set(collectionSet, (counts.get(collectionSet) ?? 0) + 1);
    }

    expect([...counts.keys()].sort()).toEqual([...COLLECTION_SETS].sort());
    expect(counts.get('spaceStations')).toBe(bundledSnapshot.groups.stations.length);
  });
});
