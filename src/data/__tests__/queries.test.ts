import type { Database } from '../database';
import {
  nextPassQuery,
  satelliteOrbitQuery,
  upcomingPassesQuery,
  upcomingPassSummariesQuery,
} from '../queries';
import { createRepositories } from '../repositories';
import { bundledSnapshot, importSnapshot } from '../snapshot';
import { createTestDatabase } from '../testing/createTestDatabase';
import { HUBBLE_NORAD_ID, ISS_NORAD_ID, makePass } from '../testing/fixtures';

const FIRST_PASS = Date.UTC(2026, 10, 8, 21, 12);
const SECOND_PASS = FIRST_PASS + 5_400_000;

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('nextPassQuery', () => {
  describe('given two ISS passes 90 minutes apart', () => {
    beforeEach(() => {
      createRepositories(db).passes.replaceAll([
        makePass({ startAt: FIRST_PASS }),
        makePass({ startAt: SECOND_PASS }),
      ]);
    });

    test('then a pass in progress is the next one', async () => {
      expect(await nextPassQuery(db, ISS_NORAD_ID, FIRST_PASS + 60_000)).toEqual([
        { startAt: FIRST_PASS },
      ]);
    });

    test('then after the first pass has ended the next one is the later pass', async () => {
      expect(await nextPassQuery(db, ISS_NORAD_ID, FIRST_PASS + 600_000)).toEqual([
        { startAt: SECOND_PASS },
      ]);
    });

    test('then a satellite with no passes has no next pass', async () => {
      expect(await nextPassQuery(db, HUBBLE_NORAD_ID, FIRST_PASS)).toEqual([]);
    });
  });
});

describe('satelliteOrbitQuery', () => {
  describe('given the bundled snapshot has been imported', () => {
    beforeEach(() => {
      importSnapshot(createRepositories(db), bundledSnapshot);
    });

    test('then a docked ISS module names the ISS as its host', async () => {
      expect(await satelliteOrbitQuery(db, 49044)).toEqual([
        expect.objectContaining({ hostId: ISS_NORAD_ID, hostName: 'ISS (ZARYA)' }),
      ]);
    });

    test('then the ISS has no host', async () => {
      expect(await satelliteOrbitQuery(db, ISS_NORAD_ID)).toEqual([
        expect.objectContaining({ hostId: null, hostName: null }),
      ]);
    });
  });
});

describe('upcomingPassSummariesQuery', () => {
  describe('given an ISS pass is stored with its track', () => {
    beforeEach(() => {
      const repositories = createRepositories(db);
      importSnapshot(repositories, bundledSnapshot);
      repositories.passes.replaceAll([makePass({ startAt: FIRST_PASS })]);
    });

    test('then it lists the same pass as the full query, without the track', async () => {
      const [full] = await upcomingPassesQuery(db, FIRST_PASS - 60_000);
      const { track, ...summary } = full!;

      expect(track.length).toBeGreaterThan(0);
      expect(await upcomingPassSummariesQuery(db, FIRST_PASS - 60_000)).toEqual([summary]);
    });
  });
});
