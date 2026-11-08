import { createRepositories, type Repositories } from '@/data/repositories';
import { bundledSnapshot, importSnapshot } from '@/data/snapshot';
import { createTestDatabase } from '@/data/testing/createTestDatabase';
import { makeOmm } from '@/data/testing/fixtures';
import type { CelestrakGroup } from '@/domain/types';

import {
  backoffDelay,
  CelestrakError,
  FIRST_BACKOFF,
  httpOrbitFetcher,
  MAX_BACKOFF,
  MIN_REFRESH_INTERVAL,
  refreshGroup,
  refreshOrbits,
  type OrbitFetcher,
} from '../celestrak';

const MINUTE = 60_000;
const SNAPSHOT = bundledSnapshot.fetchedAt;

let repositories: Repositories;

beforeEach(() => {
  repositories = createRepositories(createTestDatabase());
  importSnapshot(repositories, bundledSnapshot);
});

const fresh: OrbitFetcher = async () => [
  makeOmm({ NORAD_CAT_ID: 25544, EPOCH: '2026-11-09T00:00:00.000' }),
];

describe('the 2-hour rule', () => {
  test('never asks CelesTrak again within 2 hours of the last fetch', async () => {
    const fetcher = jest.fn(fresh);

    expect(
      await refreshGroup(repositories, 'stations', fetcher, SNAPSHOT + MIN_REFRESH_INTERVAL - 1),
    ).toBe('fresh');
    expect(fetcher).not.toHaveBeenCalled();
  });

  test('fetches once 2 hours have passed, replacing the group', async () => {
    const fetcher = jest.fn(fresh);
    const now = SNAPSHOT + MIN_REFRESH_INTERVAL;

    expect(await refreshGroup(repositories, 'stations', fetcher, now)).toBe('updated');
    expect(fetcher).toHaveBeenCalledWith('stations');
    expect(repositories.orbits.latestFetchedAt('stations')).toBe(now);
    expect(repositories.orbits.getById(25544)?.epoch).toBe(Date.UTC(2026, 10, 9));
  });

  test('counts from the latest download, so a second refresh straight after is skipped', async () => {
    const fetcher = jest.fn(fresh);
    const now = SNAPSHOT + 3 * MIN_REFRESH_INTERVAL;
    await refreshGroup(repositories, 'stations', fetcher, now);

    expect(await refreshGroup(repositories, 'stations', fetcher, now + 10 * MINUTE)).toBe('fresh');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test('fetches only the two groups the app uses, each on its own clock', async () => {
    const asked: CelestrakGroup[] = [];
    const fetcher: OrbitFetcher = async (group) => {
      asked.push(group);
      return fresh(group);
    };

    const outcomes = await refreshOrbits(repositories, fetcher, SNAPSHOT + MIN_REFRESH_INTERVAL);

    expect(asked).toEqual(['visual', 'stations']);
    expect(outcomes).toEqual({ visual: 'updated', stations: 'updated' });
  });
});

describe('failures and backoff', () => {
  const now = SNAPSHOT + MIN_REFRESH_INTERVAL;
  const failing: OrbitFetcher = async () => Promise.reject(new CelestrakError('down', 500));

  test('a failure never retries immediately and keeps the stored orbits', async () => {
    const before = repositories.orbits.listAll().length;

    expect(await refreshGroup(repositories, 'visual', failing, now)).toBe('failed');
    expect(await refreshGroup(repositories, 'visual', jest.fn(fresh), now + 1)).toBe('backingOff');
    expect(repositories.orbits.listAll()).toHaveLength(before);
  });

  test('retries after the backoff and resets it on success', async () => {
    await refreshGroup(repositories, 'visual', failing, now);

    expect(await refreshGroup(repositories, 'visual', fresh, now + FIRST_BACKOFF)).toBe('updated');
    expect(repositories.syncMeta.get('celestrak.visual.failures')).toBe('0');
  });

  test('backs off exponentially up to a cap', () => {
    expect([1, 2, 3, 4].map((failures) => backoffDelay(failures, 500) / MINUTE)).toEqual([
      5, 10, 20, 40,
    ]);
    expect(backoffDelay(30, null)).toBe(MAX_BACKOFF);
  });

  test('an HTTP 403 means "too soon", so it waits the full 2 hours', async () => {
    const tooSoon: OrbitFetcher = async () => Promise.reject(new CelestrakError('403', 403));
    await refreshGroup(repositories, 'visual', tooSoon, now);

    expect(await refreshGroup(repositories, 'visual', fresh, now + MIN_REFRESH_INTERVAL - 1)).toBe(
      'backingOff',
    );
    expect(await refreshGroup(repositories, 'visual', fresh, now + MIN_REFRESH_INTERVAL)).toBe(
      'updated',
    );
  });
});

describe('httpOrbitFetcher', () => {
  const respond = (status: number, body: unknown) =>
    jest.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  test('asks CelesTrak for one group as JSON', async () => {
    const fetchImpl = respond(200, [makeOmm()]);

    await httpOrbitFetcher(fetchImpl)('visual');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=JSON',
    );
  });

  test('reports the HTTP status of a refusal', async () => {
    await expect(httpOrbitFetcher(respond(403, 'too soon'))('visual')).rejects.toMatchObject({
      status: 403,
    });
  });

  test('rejects empty or malformed responses', async () => {
    await expect(httpOrbitFetcher(respond(200, []))('visual')).rejects.toThrow('no usable orbits');
    await expect(httpOrbitFetcher(respond(200, [{ NORAD_CAT_ID: 1 }]))('visual')).rejects.toThrow(
      'no usable orbits',
    );
  });
});
