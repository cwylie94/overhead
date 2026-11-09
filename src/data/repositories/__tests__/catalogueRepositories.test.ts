import { createRepositories } from '..';
import type { Database } from '../../database';
import type { NewOrbit } from '../../schema';
import { bundledSnapshot, importSnapshot } from '../../snapshot';
import { createTestDatabase } from '../../testing/createTestDatabase';
import {
  HUBBLE_NORAD_ID,
  ISS_NORAD_ID,
  makeOrbit,
  makePass,
  makeSatellite,
} from '../../testing/fixtures';
import { createOrbitRepository } from '../orbitRepository';
import { createPassRepository } from '../passRepository';
import { createSatelliteRepository } from '../satelliteRepository';
import { createSyncMetaRepository } from '../syncMetaRepository';

const EVENING = Date.UTC(2026, 10, 8, 18);
const MORNING = Date.UTC(2026, 10, 9, 6);
const FIRST_PASS = Date.UTC(2026, 10, 8, 21, 12);
const SECOND_PASS = FIRST_PASS + 5_400_000;

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('createSatelliteRepository', () => {
  describe('given the ISS and Hubble have been stored', () => {
    beforeEach(() => {
      createSatelliteRepository(db).upsertMany([
        makeSatellite(),
        makeSatellite({ noradId: HUBBLE_NORAD_ID, name: 'HST', rarity: 'uncommon' }),
      ]);
    });

    describe('when the ISS is upserted again as rare', () => {
      beforeEach(() => {
        createSatelliteRepository(db).upsertMany([makeSatellite({ rarity: 'rare' })]);
      });

      test('then it lists both satellites by name', () => {
        expect(
          createSatelliteRepository(db)
            .listAll()
            .map((s) => s.name),
        ).toEqual(['HST', 'ISS (ZARYA)']);
      });

      test('then the ISS is now rare', () => {
        expect(createSatelliteRepository(db).getById(ISS_NORAD_ID)?.rarity).toBe('rare');
      });
    });
  });

  describe('given an empty database', () => {
    describe('when more satellites are upserted than fit in one insert statement', () => {
      beforeEach(() => {
        createSatelliteRepository(db).upsertMany(
          Array.from({ length: 450 }, (_, i) =>
            makeSatellite({ noradId: 10_000 + i, name: `SAT ${i}` }),
          ),
        );
      });

      test('then it stores them all', () => {
        expect(createSatelliteRepository(db).listAll()).toHaveLength(450);
      });
    });
  });
});

describe('createOrbitRepository', () => {
  describe('given the stations and visual groups are stored', () => {
    beforeEach(() => {
      const orbits = createOrbitRepository(db);
      orbits.replaceGroup('stations', [makeOrbit()]);
      orbits.replaceGroup('visual', [makeOrbit({ noradId: HUBBLE_NORAD_ID, group: 'visual' })]);
    });

    describe('when the visual group is refreshed', () => {
      beforeEach(() => {
        createOrbitRepository(db).replaceGroup('visual', [
          makeOrbit({ noradId: HUBBLE_NORAD_ID, group: 'visual', epoch: 2 }),
        ]);
      });

      test('then both groups still have their rows', () => {
        expect(createOrbitRepository(db).listAll()).toHaveLength(2);
      });

      test('then the visual orbit is replaced', () => {
        expect(createOrbitRepository(db).getById(HUBBLE_NORAD_ID)?.epoch).toBe(2);
      });

      test('then the stations orbit is untouched', () => {
        expect(createOrbitRepository(db).getById(ISS_NORAD_ID)?.group).toBe('stations');
      });
    });
  });

  describe('given an empty database', () => {
    test('then a group has no latest fetch time', () => {
      expect(createOrbitRepository(db).latestFetchedAt('visual')).toBeUndefined();
    });

    describe('when the ISS orbit is stored', () => {
      let orbit: NewOrbit;

      beforeEach(() => {
        orbit = makeOrbit();
        createOrbitRepository(db).replaceGroup('stations', [orbit]);
      });

      test('then its OMM JSON reads back unchanged', () => {
        expect(createOrbitRepository(db).getById(ISS_NORAD_ID)?.omm).toEqual(orbit.omm);
      });
    });
  });

  describe('given visual orbits fetched at 100 and 300 and a stations orbit fetched at 900', () => {
    beforeEach(() => {
      const orbits = createOrbitRepository(db);
      orbits.replaceGroup('visual', [
        makeOrbit({ noradId: 1, group: 'visual', fetchedAt: 100 }),
        makeOrbit({ noradId: 2, group: 'visual', fetchedAt: 300 }),
      ]);
      orbits.replaceGroup('stations', [makeOrbit({ fetchedAt: 900 })]);
    });

    test.each([
      { group: 'visual' as const, fetchedAt: 300 },
      { group: 'stations' as const, fetchedAt: 900 },
    ])('then the latest fetch of $group is at $fetchedAt', ({ group, fetchedAt }) => {
      expect(createOrbitRepository(db).latestFetchedAt(group)).toBe(fetchedAt);
    });
  });

  describe('given the bundled snapshot has been imported', () => {
    beforeEach(() => {
      importSnapshot(createRepositories(db), bundledSnapshot);
    });

    test('then a bundled ISS module is folded into the ISS', () => {
      expect(createRepositories(db).orbits.dockingHosts().get(49044)).toBe(25544);
    });

    test('then the ISS is not folded into anything', () => {
      expect(createRepositories(db).orbits.dockingHosts().has(25544)).toBe(false);
    });
  });
});

describe('createPassRepository', () => {
  describe('given passes this evening, at night and the next afternoon', () => {
    beforeEach(() => {
      createPassRepository(db).replaceAll([
        makePass({ startAt: Date.UTC(2026, 10, 8, 22) }),
        makePass({ startAt: Date.UTC(2026, 10, 8, 19), noradId: HUBBLE_NORAD_ID }),
        makePass({ startAt: Date.UTC(2026, 10, 9, 12) }),
      ]);
    });

    test('then it lists the passes overlapping the night in start order', () => {
      expect(
        createPassRepository(db)
          .listBetween(EVENING, MORNING)
          .map((p) => p.noradId),
      ).toEqual([HUBBLE_NORAD_ID, ISS_NORAD_ID]);
    });

    test('then a listed pass keeps its track', () => {
      expect(createPassRepository(db).listBetween(EVENING, MORNING)[1]?.track).toHaveLength(3);
    });
  });

  describe('given one stored pass', () => {
    beforeEach(() => {
      createPassRepository(db).replaceAll([makePass()]);
    });

    test('then it reads back by its id', () => {
      const passes = createPassRepository(db);
      const [stored] = passes.listBetween(EVENING, MORNING);
      expect(passes.getById(stored!.id)?.noradId).toBe(ISS_NORAD_ID);
    });

    test('then an unknown id reads back as nothing', () => {
      expect(createPassRepository(db).getById(-1)).toBeUndefined();
    });
  });

  describe('given two cached passes', () => {
    beforeEach(() => {
      createPassRepository(db).replaceAll([
        makePass(),
        makePass({ startAt: Date.UTC(2026, 10, 8, 23) }),
      ]);
    });

    describe('when the cache is replaced with one new pass', () => {
      beforeEach(() => {
        createPassRepository(db).replaceAll([makePass({ startAt: Date.UTC(2026, 10, 8, 20) })]);
      });

      test('then only the new pass is left', () => {
        expect(createPassRepository(db).listBetween(EVENING, MORNING)).toHaveLength(1);
      });
    });
  });

  describe('given two ISS passes 90 minutes apart', () => {
    beforeEach(() => {
      createPassRepository(db).replaceAll([
        makePass({ startAt: FIRST_PASS }),
        makePass({ startAt: SECOND_PASS }),
      ]);
    });

    test('then a pass in progress is the next one', () => {
      expect(
        createPassRepository(db).nextForSatellite(ISS_NORAD_ID, FIRST_PASS + 60_000)?.startAt,
      ).toBe(FIRST_PASS);
    });

    test('then after the first pass has ended the next one is the later pass', () => {
      expect(
        createPassRepository(db).nextForSatellite(ISS_NORAD_ID, FIRST_PASS + 600_000)?.startAt,
      ).toBe(SECOND_PASS);
    });

    test('then a satellite with no passes has no next pass', () => {
      expect(
        createPassRepository(db).nextForSatellite(HUBBLE_NORAD_ID, FIRST_PASS),
      ).toBeUndefined();
    });
  });
});

describe('createSyncMetaRepository', () => {
  describe('given an empty database', () => {
    test('then a key has no value', () => {
      expect(createSyncMetaRepository(db).get('pullCursor')).toBeUndefined();
    });
  });

  describe('given a key has been set', () => {
    beforeEach(() => {
      createSyncMetaRepository(db).set('pullCursor', '10');
    });

    describe('when it is set again', () => {
      beforeEach(() => {
        createSyncMetaRepository(db).set('pullCursor', '42');
      });

      test('then it holds the new value', () => {
        expect(createSyncMetaRepository(db).get('pullCursor')).toBe('42');
      });
    });
  });
});
