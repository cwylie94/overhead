import { london, skyfield } from '@/domain/testing/skyfieldFixture';

import type { Database } from '../../database';
import { createRepositories, type Repositories } from '../../repositories';
import { bundledSnapshot, importSnapshot } from '../../snapshot';
import { createTestDatabase } from '../../testing/createTestDatabase';
import { makeOrbit } from '../../testing/fixtures';
import {
  isPassCacheFresh,
  MIN_LOOKAHEAD,
  PASS_WINDOW_AFTER,
  refreshPassCache,
  type PassCacheInput,
} from '../passCache';

const noYield = async () => {};
const input: PassCacheInput = { observer: london, minElevation: 10, now: skyfield.window.start };

let db: Database;
let repositories: Repositories;

beforeAll(() => {
  db = createTestDatabase();
  repositories = createRepositories(db);
  importSnapshot(repositories, bundledSnapshot);
});

describe('refreshPassCache', () => {
  test('stores only visible passes, with their visible window and brightness', async () => {
    const result = await refreshPassCache(repositories, input, { force: true, yieldToUi: noYield });
    const stored = repositories.passes.listBetween(input.now, input.now + PASS_WINDOW_AFTER);

    expect(result).toEqual({ status: 'computed', passes: stored.length });
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

  test('matches the visible parts Skyfield found for the same night', async () => {
    await refreshPassCache(repositories, input, { force: true, yieldToUi: noYield });
    const firstNightEnd = input.now + 16 * 60 * 60_000;
    const stored = repositories.passes.listBetween(input.now, firstNightEnd);
    const expected = skyfield.passes.filter(
      (pass) =>
        pass.visible.some(([start, end]) => end - start >= 25_000) &&
        pass.riseAt >= input.now &&
        pass.setAt < firstNightEnd,
    );

    for (const pass of expected) {
      const [start] = pass.visible.find(([s, e]) => e - s >= 25_000)!;
      expect(
        stored.some((row) => row.noradId === pass.noradId && Math.abs(row.startAt - start) < 3_000),
      ).toBe(true);
    }
  });

  test('skips the work while the cache is fresh', async () => {
    await refreshPassCache(repositories, input, { force: true, yieldToUi: noYield });

    expect(isPassCacheFresh(repositories, input)).toBe(true);
    expect(await refreshPassCache(repositories, input, { yieldToUi: noYield })).toEqual({
      status: 'fresh',
    });
  });

  test.each([
    ['the observer moves', { observer: { ...london, latitude: 48.86 } }],
    ['the minimum elevation changes', { minElevation: 20 }],
    ['the lookahead runs low', { now: input.now + PASS_WINDOW_AFTER - MIN_LOOKAHEAD + 1 }],
  ])('recomputes when %s', async (_, change) => {
    await refreshPassCache(repositories, input, { force: true, yieldToUi: noYield });

    expect(isPassCacheFresh(repositories, { ...input, ...change })).toBe(false);
  });

  test('recomputes when new orbit data arrives', async () => {
    const isolated = createRepositories(createTestDatabase());
    importSnapshot(isolated, bundledSnapshot);
    await refreshPassCache(isolated, input, { force: true, yieldToUi: noYield });

    isolated.orbits.replaceGroup('stations', [
      makeOrbit({ group: 'stations', fetchedAt: bundledSnapshot.fetchedAt + 1 }),
    ]);

    expect(isPassCacheFresh(isolated, input)).toBe(false);
  });

  test('a cancelled run leaves the previous cache untouched', async () => {
    await refreshPassCache(repositories, input, { force: true, yieldToUi: noYield });
    const before = repositories.passes.listBetween(input.now, input.now + PASS_WINDOW_AFTER).length;
    const controller = new AbortController();

    const result = await refreshPassCache(
      repositories,
      { ...input, minElevation: 40 },
      { signal: controller.signal, yieldToUi: async () => controller.abort() },
    );

    expect(result).toEqual({ status: 'cancelled' });
    expect(repositories.passes.listBetween(input.now, input.now + PASS_WINDOW_AFTER)).toHaveLength(
      before,
    );
  });

  test('yields to the UI between chunks of satellites', async () => {
    const yieldToUi = jest.fn(async () => {});

    await refreshPassCache(repositories, input, { force: true, yieldToUi });

    expect(yieldToUi.mock.calls.length).toBeGreaterThan(10);
  });
});
