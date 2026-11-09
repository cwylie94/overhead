import { ommEpochToMillis } from '@/domain/catalogue';
import { COLLECTION_SETS } from '@/domain/collectionSets';
import { RARITIES } from '@/domain/types';

import type { Database } from '../../database';
import { createRepositories, type Repositories } from '../../repositories';
import { createTestDatabase } from '../../testing/createTestDatabase';
import { HUBBLE_NORAD_ID, ISS_NORAD_ID, makeOmm, makeOrbit } from '../../testing/fixtures';
import { bundledSnapshot, importSnapshot, type Snapshot } from '../index';

type ImportResult = ReturnType<typeof importSnapshot>;

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

const RENAMED: Snapshot = {
  ...snapshot,
  fetchedAt: FETCHED_AT + 1,
  satcat: snapshot.satcat.map((record) => ({
    ...record,
    OBJECT_NAME: `${record.OBJECT_NAME}*`,
  })),
};

describe('importSnapshot', () => {
  describe('given an empty database', () => {
    describe('when the snapshot is imported', () => {
      let result: ImportResult;

      beforeEach(() => {
        result = importSnapshot(repositories, snapshot);
      });

      test('then it reports importing the catalogue and both orbit groups', () => {
        expect(result).toEqual({ catalogue: true, groups: ['visual', 'stations'] });
      });

      test.each([
        { name: 'Hubble', noradId: HUBBLE_NORAD_ID, rarity: 'rare' },
        { name: 'the ISS', noradId: ISS_NORAD_ID, rarity: 'common' },
      ])('then $name is $rarity', ({ noradId, rarity }) => {
        expect(repositories.satellites.getById(noradId)?.rarity).toBe(rarity);
      });

      test('then it stores one orbit per satellite', () => {
        expect(repositories.orbits.listAll()).toHaveLength(2);
      });

      test('then Hubble’s orbit has its group, fetch time and epoch', () => {
        expect(repositories.orbits.getById(HUBBLE_NORAD_ID)).toMatchObject({
          group: 'visual',
          fetchedAt: FETCHED_AT,
          epoch: ommEpochToMillis(snapshot.groups.visual[0]!.EPOCH),
        });
      });
    });
  });

  describe('given the snapshot has been imported', () => {
    beforeEach(() => {
      importSnapshot(repositories, snapshot);
    });

    describe('when it is imported again', () => {
      let result: ImportResult;

      beforeEach(() => {
        result = importSnapshot(repositories, snapshot);
      });

      test('then it does nothing', () => {
        expect(result).toEqual({ catalogue: false, groups: [] });
      });
    });

    describe('when a newer snapshot with renamed satellites is imported', () => {
      let result: ImportResult;

      beforeEach(() => {
        result = importSnapshot(repositories, RENAMED);
      });

      test('then it reports refreshing the catalogue', () => {
        expect(result.catalogue).toBe(true);
      });

      test('then the satellites have their new names', () => {
        expect(repositories.satellites.getById(HUBBLE_NORAD_ID)?.name).toBe('HST*');
      });
    });
  });

  describe('given the snapshot was imported under the first rarity rules', () => {
    beforeEach(() => {
      importSnapshot(repositories, snapshot, 1);
    });

    describe('when it is imported under new rarity rules', () => {
      let result: ImportResult;

      beforeEach(() => {
        result = importSnapshot(repositories, snapshot, 2);
      });

      test('then it re-imports the catalogue but not the orbits', () => {
        expect(result).toEqual({ catalogue: true, groups: [] });
      });
    });
  });

  describe('given the snapshot was imported under the first and then the new rarity rules', () => {
    beforeEach(() => {
      importSnapshot(repositories, snapshot, 1);
      importSnapshot(repositories, snapshot, 2);
    });

    describe('when it is imported under the new rules again', () => {
      let result: ImportResult;

      beforeEach(() => {
        result = importSnapshot(repositories, snapshot, 2);
      });

      test('then it leaves the catalogue alone', () => {
        expect(result.catalogue).toBe(false);
      });
    });
  });

  describe('given station orbits were downloaded after the snapshot was taken', () => {
    beforeEach(() => {
      repositories.orbits.replaceGroup('stations', [
        makeOrbit({ group: 'stations', epoch: 42, fetchedAt: FETCHED_AT + 60_000 }),
      ]);
    });

    describe('when the snapshot is imported', () => {
      let result: ImportResult;

      beforeEach(() => {
        result = importSnapshot(repositories, snapshot);
      });

      test('then it imports only the visual group', () => {
        expect(result.groups).toEqual(['visual']);
      });

      test('then the ISS orbit comes from the snapshot’s visual group', () => {
        expect(repositories.orbits.getById(ISS_NORAD_ID)?.epoch).not.toBe(42);
        expect(repositories.orbits.getById(ISS_NORAD_ID)?.group).toBe('visual');
      });
    });
  });
});

describe('bundledSnapshot', () => {
  describe('given it has been imported into an empty database', () => {
    beforeEach(() => {
      importSnapshot(repositories, bundledSnapshot);
    });

    test('then every catalogue record is stored', () => {
      const satelliteIds = new Set(repositories.satellites.listAll().map((s) => s.noradId));
      expect(satelliteIds.size).toBe(bundledSnapshot.satcat.length);
    });

    test('then more than 100 orbits are stored', () => {
      expect(repositories.orbits.listAll().length).toBeGreaterThan(100);
    });

    test('then every orbit has a catalogue entry', () => {
      const satelliteIds = new Set(repositories.satellites.listAll().map((s) => s.noradId));
      expect(
        repositories.orbits.listAll().filter((orbit) => !satelliteIds.has(orbit.noradId)),
      ).toEqual([]);
    });

    test('then the ISS is common', () => {
      expect(repositories.satellites.getById(ISS_NORAD_ID)?.rarity).toBe('common');
    });

    test('then the rarities form a pyramid, each tier larger than the one above', () => {
      const counts = Object.fromEntries(RARITIES.map((rarity) => [rarity, 0]));
      for (const { rarity } of repositories.satellites.listAll()) {
        counts[rarity]! += 1;
      }

      expect(counts.legendary).toBeGreaterThan(0);
      expect(counts.rare).toBeGreaterThan(counts.legendary!);
      expect(counts.uncommon).toBeGreaterThan(counts.rare!);
      expect(counts.common).toBeGreaterThan(counts.uncommon!);
    });

    test('then every collection set has members', () => {
      const sets = new Set(repositories.satellites.listAll().map((s) => s.collectionSet));
      expect([...sets].sort()).toEqual([...COLLECTION_SETS].sort());
    });

    test.each([25544, 48274, 49044, 36086, 53239, 100882, 69180])(
      'then %p, a station or something docked to one, is a space station',
      (noradId) => {
        expect(repositories.satellites.getById(noradId)?.collectionSet).toBe('spaceStations');
      },
    );

    test.each([66906, 67683, 67685, 67688, 49271, 66515])(
      'then %p, listed with the stations but not docked to one, is not a space station',
      (noradId) => {
        expect(repositories.satellites.getById(noradId)?.collectionSet).not.toBe('spaceStations');
      },
    );
  });
});
