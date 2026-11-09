import { createRepositories, type Repositories } from '@/data/repositories';
import { bundledSnapshot, importSnapshot } from '@/data/snapshot';
import { createTestDatabase } from '@/data/testing/createTestDatabase';
import { makeOmm } from '@/data/testing/fixtures';
import type { CelestrakGroup } from '@/domain/types';

import {
  anyFailed,
  backoffDelay,
  CelestrakError,
  FIRST_BACKOFF,
  httpOrbitFetcher,
  MAX_BACKOFF,
  MIN_REFRESH_INTERVAL,
  orbitsChanged,
  refreshGroup,
  refreshOrbits,
  type OrbitFetcher,
  type RefreshOutcome,
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
const failing: OrbitFetcher = async () => Promise.reject(new CelestrakError('down', 500));
const tooSoon: OrbitFetcher = async () => Promise.reject(new CelestrakError('403', 403));
const TWO_HOURS_LATER = SNAPSHOT + MIN_REFRESH_INTERVAL;

const respond = (status: number, body: unknown) =>
  jest.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('refreshGroup', () => {
  describe('given the stations group was last fetched with the bundled snapshot', () => {
    let fetcher: jest.Mock<ReturnType<OrbitFetcher>, Parameters<OrbitFetcher>>;

    beforeEach(() => {
      fetcher = jest.fn(fresh);
    });

    describe('when it is refreshed just under 2 hours later', () => {
      let outcome: RefreshOutcome;

      beforeEach(async () => {
        outcome = await refreshGroup(
          repositories,
          'stations',
          fetcher,
          SNAPSHOT + MIN_REFRESH_INTERVAL - 1,
        );
      });

      test('then it reports the orbits as fresh', () => {
        expect(outcome).toBe('fresh');
      });

      test('then it never asks CelesTrak', () => {
        expect(fetcher).not.toHaveBeenCalled();
      });
    });

    describe('when it is refreshed 2 hours later', () => {
      let outcome: RefreshOutcome;

      beforeEach(async () => {
        outcome = await refreshGroup(repositories, 'stations', fetcher, TWO_HOURS_LATER);
      });

      test('then it reports the group as updated', () => {
        expect(outcome).toBe('updated');
      });

      test('then it asks CelesTrak for the stations group', () => {
        expect(fetcher).toHaveBeenCalledWith('stations');
      });

      test('then it records when the group was fetched', () => {
        expect(repositories.orbits.latestFetchedAt('stations')).toBe(TWO_HOURS_LATER);
      });

      test('then it replaces the group’s orbits', () => {
        expect(repositories.orbits.getById(25544)?.epoch).toBe(Date.UTC(2026, 10, 9));
      });
    });
  });

  describe('given the stations group was downloaded 6 hours after the snapshot', () => {
    let fetcher: jest.Mock<ReturnType<OrbitFetcher>, Parameters<OrbitFetcher>>;
    const downloadedAt = SNAPSHOT + 3 * MIN_REFRESH_INTERVAL;

    beforeEach(async () => {
      fetcher = jest.fn(fresh);
      await refreshGroup(repositories, 'stations', fetcher, downloadedAt);
    });

    describe('when it is refreshed 10 minutes later', () => {
      let outcome: RefreshOutcome;

      beforeEach(async () => {
        outcome = await refreshGroup(repositories, 'stations', fetcher, downloadedAt + 10 * MINUTE);
      });

      test('then it counts from the latest download and reports the orbits as fresh', () => {
        expect(outcome).toBe('fresh');
      });

      test('then CelesTrak has been asked only once', () => {
        expect(fetcher).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given CelesTrak is failing', () => {
    describe('when the visual group is refreshed 2 hours after the snapshot', () => {
      let outcome: RefreshOutcome;

      beforeEach(async () => {
        outcome = await refreshGroup(repositories, 'visual', failing, TWO_HOURS_LATER);
      });

      test('then it reports the refresh as failed', () => {
        expect(outcome).toBe('failed');
      });
    });
  });

  describe('given a refresh of the visual group has just failed', () => {
    let before: number;

    beforeEach(async () => {
      before = repositories.orbits.listAll().length;
      await refreshGroup(repositories, 'visual', failing, TWO_HOURS_LATER);
    });

    describe('when it is refreshed again straight away', () => {
      let outcome: RefreshOutcome;

      beforeEach(async () => {
        outcome = await refreshGroup(repositories, 'visual', jest.fn(fresh), TWO_HOURS_LATER + 1);
      });

      test('then it backs off rather than retrying immediately', () => {
        expect(outcome).toBe('backingOff');
      });

      test('then it keeps the stored orbits', () => {
        expect(repositories.orbits.listAll()).toHaveLength(before);
      });
    });

    describe('when it is refreshed once the first backoff has passed', () => {
      let outcome: RefreshOutcome;

      beforeEach(async () => {
        outcome = await refreshGroup(
          repositories,
          'visual',
          fresh,
          TWO_HOURS_LATER + FIRST_BACKOFF,
        );
      });

      test('then it retries and updates the group', () => {
        expect(outcome).toBe('updated');
      });

      test('then it resets the backoff', () => {
        expect(repositories.syncMeta.get('celestrak.visual.failures')).toBe('0');
      });
    });
  });

  describe('given CelesTrak refused the visual group as too soon', () => {
    beforeEach(async () => {
      await refreshGroup(repositories, 'visual', tooSoon, TWO_HOURS_LATER);
    });

    describe('when it is refreshed just under 2 hours later', () => {
      let outcome: RefreshOutcome;

      beforeEach(async () => {
        outcome = await refreshGroup(
          repositories,
          'visual',
          fresh,
          TWO_HOURS_LATER + MIN_REFRESH_INTERVAL - 1,
        );
      });

      test('then it is still backing off', () => {
        expect(outcome).toBe('backingOff');
      });
    });
  });

  describe('given CelesTrak refused the visual group as too soon and a retry just under 2 hours later was held back', () => {
    beforeEach(async () => {
      await refreshGroup(repositories, 'visual', tooSoon, TWO_HOURS_LATER);
      await refreshGroup(repositories, 'visual', fresh, TWO_HOURS_LATER + MIN_REFRESH_INTERVAL - 1);
    });

    describe('when it is refreshed the full 2 hours later', () => {
      let outcome: RefreshOutcome;

      beforeEach(async () => {
        outcome = await refreshGroup(
          repositories,
          'visual',
          fresh,
          TWO_HOURS_LATER + MIN_REFRESH_INTERVAL,
        );
      });

      test('then it updates the group', () => {
        expect(outcome).toBe('updated');
      });
    });
  });
});

describe('refreshOrbits', () => {
  describe('given both groups were last fetched with the bundled snapshot', () => {
    let asked: CelestrakGroup[];
    let fetcher: OrbitFetcher;

    beforeEach(() => {
      asked = [];
      fetcher = async (group) => {
        asked.push(group);
        return fresh(group);
      };
    });

    describe('when the orbits are refreshed 2 hours later', () => {
      let outcomes: Record<CelestrakGroup, RefreshOutcome>;

      beforeEach(async () => {
        outcomes = await refreshOrbits(repositories, fetcher, TWO_HOURS_LATER);
      });

      test('then it fetches only the two groups the app uses', () => {
        expect(asked).toEqual(['visual', 'stations']);
      });

      test('then it updates each group on its own clock', () => {
        expect(outcomes).toEqual({ visual: 'updated', stations: 'updated' });
      });
    });
  });
});

describe('backoffDelay', () => {
  describe('given repeated server errors', () => {
    test.each([
      { failures: 1, minutes: 5 },
      { failures: 2, minutes: 10 },
      { failures: 3, minutes: 20 },
      { failures: 4, minutes: 40 },
    ])('then after $failures failures it waits $minutes minutes', ({ failures, minutes }) => {
      expect(backoffDelay(failures, 500) / MINUTE).toBe(minutes);
    });
  });

  describe('given many failures', () => {
    test('then it waits no longer than the cap', () => {
      expect(backoffDelay(30, null)).toBe(MAX_BACKOFF);
    });
  });
});

describe('httpOrbitFetcher', () => {
  describe('given CelesTrak returns an orbit', () => {
    let fetchImpl: typeof fetch;

    beforeEach(() => {
      fetchImpl = respond(200, [makeOmm()]);
    });

    describe('when the visual group is fetched', () => {
      beforeEach(async () => {
        await httpOrbitFetcher(fetchImpl)('visual');
      });

      test('then it asks CelesTrak for that one group as JSON', () => {
        expect(fetchImpl).toHaveBeenCalledWith(
          'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=JSON',
        );
      });
    });
  });

  describe('given CelesTrak refuses the request', () => {
    let fetchImpl: typeof fetch;

    beforeEach(() => {
      fetchImpl = respond(403, 'too soon');
    });

    describe('when the visual group is fetched', () => {
      let fetching: Promise<unknown>;

      beforeEach(() => {
        fetching = httpOrbitFetcher(fetchImpl)('visual');
        fetching.catch(() => {});
      });

      test('then it reports the HTTP status', async () => {
        await expect(fetching).rejects.toMatchObject({ status: 403 });
      });
    });
  });

  describe.each([
    { response: 'no orbits', body: [] },
    { response: 'an orbit with nothing but an ID', body: [{ NORAD_CAT_ID: 1 }] },
  ])('given CelesTrak returns $response', ({ body }) => {
    let fetchImpl: typeof fetch;

    beforeEach(() => {
      fetchImpl = respond(200, body);
    });

    describe('when the visual group is fetched', () => {
      let fetching: Promise<unknown>;

      beforeEach(() => {
        fetching = httpOrbitFetcher(fetchImpl)('visual');
        fetching.catch(() => {});
      });

      test('then it rejects the response as having no usable orbits', async () => {
        await expect(fetching).rejects.toThrow('no usable orbits');
      });
    });
  });
});

describe('orbitsChanged', () => {
  describe('given a group was updated', () => {
    test('then the passes need recomputing', () => {
      expect(orbitsChanged({ visual: 'updated', stations: 'fresh' })).toBe(true);
    });
  });

  describe('given no group was updated', () => {
    test('then the passes do not need recomputing', () => {
      expect(orbitsChanged({ visual: 'fresh', stations: 'backingOff' })).toBe(false);
    });
  });
});

describe('anyFailed', () => {
  describe('given one group failed', () => {
    test('then the check failed', () => {
      expect(anyFailed({ visual: 'failed', stations: 'updated' })).toBe(true);
    });
  });

  describe('given no group failed', () => {
    test('then the check did not fail', () => {
      expect(anyFailed({ visual: 'fresh', stations: 'backingOff' })).toBe(false);
    });
  });
});
