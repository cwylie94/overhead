import { london, skyfield } from '@/domain/testing/skyfieldFixture';

import type { Database } from '../../database';
import { createRepositories, type Repositories } from '../../repositories';
import { bundledSnapshot, importSnapshot, type Snapshot } from '../../snapshot';
import { createTestDatabase } from '../../testing/createTestDatabase';
import { makeOrbit } from '../../testing/fixtures';
import {
  isPassCacheFresh,
  MIN_LOOKAHEAD,
  PASS_WINDOW_AFTER,
  refreshPassCache,
  SATELLITES_PER_CHUNK,
  type PassCacheInput,
  type PassCacheResult,
} from '../passCache';
import { passRows, type PassOrbit } from '../passRows';

const noYield = async () => {};
const SMALL_SNAPSHOT: Snapshot = {
  ...bundledSnapshot,
  groups: {
    visual: bundledSnapshot.groups.visual.slice(0, 2 * SATELLITES_PER_CHUNK + 6),
    stations: bundledSnapshot.groups.stations,
  },
};
const input: PassCacheInput = { observer: london, minElevation: 10, now: skyfield.window.start };
const FIRST_NIGHT_END = input.now + 16 * 60 * 60_000;

let db: Database;
let repositories: Repositories;

function computePasses(into: Repositories = repositories) {
  return refreshPassCache(into, input, { force: true, yieldToUi: noYield });
}

function storedPasses(from: Repositories = repositories) {
  return from.passes.listBetween(input.now, input.now + PASS_WINDOW_AFTER);
}

function smallCatalogue() {
  const small = createRepositories(createTestDatabase());
  importSnapshot(small, SMALL_SNAPSHOT);
  return small;
}

beforeAll(() => {
  db = createTestDatabase();
  repositories = createRepositories(db);
  importSnapshot(repositories, bundledSnapshot);
});

describe('refreshPassCache', () => {
  describe('given the bundled snapshot', () => {
    describe('when passes are computed for London', () => {
      let result: PassCacheResult;

      beforeAll(async () => {
        result = await computePasses();
      });

      test('then it reports how many passes it stored', () => {
        expect(result).toEqual({ status: 'computed', passes: storedPasses().length });
      });

      test('then it stores only visible passes, with their visible window and brightness', () => {
        const stored = storedPasses();
        expect(stored.length).toBeGreaterThan(100);
        for (const pass of stored) {
          expect(pass.endAt).toBeGreaterThan(pass.startAt);
          expect(pass.peakAt).toBeGreaterThanOrEqual(pass.startAt);
          expect(pass.peakAt).toBeLessThanOrEqual(pass.endAt);
          expect(pass.maxElevation).toBeGreaterThanOrEqual(10 - 0.1);
          expect(pass.peakMagnitude).not.toBeNull();
          expect(pass.track[0]!.time).toBeLessThanOrEqual(pass.startAt);
        }
      });

      test('then it matches the visible parts Skyfield found for the same night', () => {
        const stored = repositories.passes.listBetween(input.now, FIRST_NIGHT_END);
        const docked = repositories.orbits.dockingHosts();
        const expected = skyfield.passes.filter(
          (pass) =>
            !docked.has(pass.noradId) &&
            pass.visible.some(([start, end]) => end - start >= 25_000) &&
            pass.riseAt >= input.now &&
            pass.setAt < FIRST_NIGHT_END,
        );

        for (const pass of expected) {
          const [start] = pass.visible.find(([s, e]) => e - s >= 25_000)!;
          expect(
            stored.some(
              (row) => row.noradId === pass.noradId && Math.abs(row.startAt - start) < 3_000,
            ),
          ).toBe(true);
        }
      });

      test('then it lists a station once, not once per docked module or visiting vehicle', () => {
        const stored = storedPasses();
        const ids = new Set(stored.map((pass) => pass.noradId));

        expect(stored.length).toBeGreaterThan(100);
        for (const docked of [36086, 49044, 53239, 54216, 100882]) {
          expect(ids.has(docked)).toBe(false);
        }
      });
    });

    describe('when passes are computed with a yield to the UI', () => {
      let yieldToUi: jest.Mock<Promise<void>, []>;

      beforeAll(async () => {
        yieldToUi = jest.fn(async () => {});
        await refreshPassCache(repositories, input, { force: true, yieldToUi });
      });

      test('then it yields to the UI between chunks of satellites', () => {
        expect(yieldToUi.mock.calls.length).toBeGreaterThan(10);
      });
    });
  });

  describe('given passes have been computed for London', () => {
    beforeAll(async () => {
      await computePasses();
    });

    test('then the cache is fresh', () => {
      expect(isPassCacheFresh(repositories, input)).toBe(true);
    });

    test.each([
      { change: 'the observer moves', changed: { observer: { ...london, latitude: 48.86 } } },
      { change: 'the minimum elevation changes', changed: { minElevation: 20 } },
      {
        change: 'the lookahead runs low',
        changed: { now: input.now + PASS_WINDOW_AFTER - MIN_LOOKAHEAD + 1 },
      },
    ])('then it needs recomputing when $change', ({ changed }) => {
      expect(isPassCacheFresh(repositories, { ...input, ...changed })).toBe(false);
    });

    test.each([
      {
        change: 'the observer moves 3 km north',
        observer: { ...london, latitude: london.latitude + 0.027 },
      },
      { change: 'only the altitude changes', observer: { ...london, altitude: 0.3 } },
    ])('then it stays fresh when $change', ({ observer }) => {
      expect(isPassCacheFresh(repositories, { ...input, observer })).toBe(true);
    });

    test('then it needs recomputing once the observer is more than 5 km away', () => {
      const observer = { ...london, latitude: london.latitude + 0.05 };
      expect(isPassCacheFresh(repositories, { ...input, observer })).toBe(false);
    });

    describe('when a refresh is asked for without forcing it', () => {
      let result: PassCacheResult;

      beforeAll(async () => {
        result = await refreshPassCache(repositories, input, { yieldToUi: noYield });
      });

      test('then it skips the work', () => {
        expect(result).toEqual({ status: 'fresh' });
      });
    });

    describe('when a run for another minimum elevation is cancelled part way', () => {
      let before: number;
      let result: PassCacheResult;

      beforeAll(async () => {
        before = storedPasses().length;
        const controller = new AbortController();
        result = await refreshPassCache(
          repositories,
          { ...input, minElevation: 40 },
          { signal: controller.signal, yieldToUi: async () => controller.abort() },
        );
      });

      test('then it reports the run as cancelled', () => {
        expect(result).toEqual({ status: 'cancelled' });
      });

      test('then it leaves the previous cache untouched', () => {
        expect(storedPasses()).toHaveLength(before);
      });
    });
  });

  describe('given passes have been computed in a database of its own', () => {
    let isolated: Repositories;

    beforeAll(async () => {
      isolated = createRepositories(createTestDatabase());
      importSnapshot(isolated, bundledSnapshot);
      await computePasses(isolated);
    });

    describe('when new orbit data arrives', () => {
      beforeAll(() => {
        isolated.orbits.replaceGroup('stations', [
          makeOrbit({ group: 'stations', fetchedAt: bundledSnapshot.fetchedAt + 1 }),
        ]);
      });

      test('then it needs recomputing', () => {
        expect(isPassCacheFresh(isolated, input)).toBe(false);
      });
    });
  });

  describe('given a small catalogue worked out on a worker that answers asynchronously', () => {
    let small: Repositories;
    let inProcess: ReturnType<typeof storedPasses>;
    let batches: PassOrbit[][];

    beforeAll(async () => {
      small = smallCatalogue();
      await computePasses(small);
      inProcess = storedPasses(small);
      batches = [];
      await refreshPassCache(small, input, {
        force: true,
        yieldToUi: noYield,
        computeRows: async (orbits, search) => {
          batches.push(orbits);
          return passRows(orbits, search);
        },
      });
    });

    test('then it stores the same passes as working them out in process', () => {
      const withoutIds = (passes: typeof inProcess) => passes.map(({ id: _id, ...pass }) => pass);
      expect(inProcess.length).toBeGreaterThan(0);
      expect(withoutIds(storedPasses(small))).toEqual(withoutIds(inProcess));
    });

    test('then it sends at most a chunk of satellites at a time', () => {
      expect(Math.max(...batches.map((batch) => batch.length))).toBe(SATELLITES_PER_CHUNK);
    });

    test('then it never sends a docked module or visiting vehicle', () => {
      const sent = new Set(batches.flat().map((orbit) => orbit.noradId));
      const docked = [...small.orbits.dockingHosts().keys()];
      expect(docked.length).toBeGreaterThan(0);
      expect(docked.filter((noradId) => sent.has(noradId))).toEqual([]);
    });
  });

  describe('given a small catalogue cancelled while the worker has a batch', () => {
    let small: Repositories;
    let before: number;
    let result: PassCacheResult;

    beforeAll(async () => {
      small = smallCatalogue();
      await computePasses(small);
      before = storedPasses(small).length;
      const controller = new AbortController();
      result = await refreshPassCache(
        small,
        { ...input, minElevation: 40 },
        {
          signal: controller.signal,
          yieldToUi: noYield,
          computeRows: async (orbits, search) => {
            controller.abort();
            return passRows(orbits, search);
          },
        },
      );
    });

    test('then it reports the run as cancelled', () => {
      expect(result).toEqual({ status: 'cancelled' });
    });

    test('then it leaves the previous cache untouched', () => {
      expect(storedPasses(small)).toHaveLength(before);
    });
  });

  describe('given a small catalogue whose worker fails part way through a run', () => {
    let small: Repositories;
    let before: number;
    let failure: unknown;

    beforeAll(async () => {
      small = smallCatalogue();
      await computePasses(small);
      before = storedPasses(small).length;
      failure = await refreshPassCache(
        small,
        { ...input, minElevation: 40 },
        {
          yieldToUi: noYield,
          computeRows: async () => {
            throw new Error('Worker stopped');
          },
        },
      ).catch((error: unknown) => error);
    });

    test('then the run fails with the worker error', () => {
      expect(failure).toEqual(new Error('Worker stopped'));
    });

    test('then it leaves the previous cache untouched', () => {
      expect(storedPasses(small)).toHaveLength(before);
    });
  });
});
