import { london, skyfield } from '@/domain/testing/skyfieldFixture';

import { createRepositories, type Repositories } from '../../repositories';
import { bundledSnapshot, importSnapshot, type Snapshot } from '../../snapshot';
import { createTestDatabase } from '../../testing/createTestDatabase';
import { SATELLITES_PER_CHUNK } from '../passCache';
import { createPassCacheRunner, type PassCacheRunner } from '../runner';

const input = { observer: london, minElevation: 10, now: skyfield.window.start };
const REYKJAVIK_INPUT = { ...input, observer: { ...input.observer, latitude: 64.1 } };
const SMALL_SNAPSHOT: Snapshot = {
  ...bundledSnapshot,
  groups: {
    visual: bundledSnapshot.groups.visual.slice(0, 2 * SATELLITES_PER_CHUNK + 6),
    stations: [],
  },
};

function setup() {
  const repositories = createRepositories(createTestDatabase());
  importSnapshot(repositories, SMALL_SNAPSHOT);
  return repositories;
}

function runnerFor(repositories: Repositories) {
  return createPassCacheRunner(repositories, { yieldToUi: async () => {} });
}

describe('createPassCacheRunner', () => {
  describe('given a runner on a newly imported database, watched for its status and whether runs replace the list', () => {
    let runner: PassCacheRunner;
    let seen: string[];
    let replacing: boolean[];

    beforeAll(() => {
      runner = runnerFor(setup());
      seen = [];
      replacing = [];
      runner.subscribe(() => seen.push(runner.getState().status));
      runner.subscribe(() => replacing.push(runner.getState().replacing));
    });

    describe('when passes are requested for London', () => {
      beforeAll(async () => {
        await runner.request(input);
      });

      test('then it reports computing, then idle', () => {
        expect(seen).toEqual(['computing', 'idle']);
      });

      test('then it is idle with the time it computed for', () => {
        expect(runner.getState()).toMatchObject({ status: 'idle', computedAt: input.now });
      });

      test('then the run says it replaces the list', () => {
        expect(replacing).toEqual([true, true]);
      });
    });
  });

  describe('given a runner that has computed passes for London, watched for whether runs replace the list', () => {
    let runner: PassCacheRunner;
    let replacing: boolean[];

    beforeAll(async () => {
      runner = runnerFor(setup());
      await runner.request(input);
      replacing = [];
      runner.subscribe(() => replacing.push(runner.getState().replacing));
    });

    describe('when a recompute is forced for London', () => {
      beforeAll(async () => {
        await runner.request(input, true);
      });

      test('then the run says it keeps the list', () => {
        expect(replacing).toEqual([false, false]);
      });
    });
  });

  describe('given a runner that has computed and recomputed passes for London, watched for whether runs replace the list', () => {
    let runner: PassCacheRunner;
    let replacing: boolean[];

    beforeAll(async () => {
      runner = runnerFor(setup());
      await runner.request(input);
      await runner.request(input, true);
      replacing = [];
      runner.subscribe(() => replacing.push(runner.getState().replacing));
    });

    describe('when passes are requested for Reykjavik', () => {
      beforeAll(async () => {
        await runner.request(REYKJAVIK_INPUT);
      });

      test('then the run says it replaces the list', () => {
        expect(replacing).toEqual([true, true]);
      });
    });
  });

  describe('given one runner has computed passes and a new runner opens on the same database', () => {
    let afterRun: number;
    let reopened: PassCacheRunner;

    beforeAll(async () => {
      const repositories = setup();
      const first = runnerFor(repositories);
      await first.request(input);
      afterRun = first.getState().settledAt!;
      reopened = runnerFor(repositories);
    });

    test('then the new runner has not settled', () => {
      expect(reopened.getState().settledAt).toBeNull();
    });

    describe('when the new runner finds the cache fresh', () => {
      beforeAll(async () => {
        await reopened.request(input);
      });

      test('then it settles after the first run', () => {
        expect(reopened.getState().settledAt!).toBeGreaterThan(afterRun);
      });
    });
  });

  describe('given a new runner on a computed database has already found the cache fresh', () => {
    let reopened: PassCacheRunner;
    let afterFreshCheck: number;

    beforeAll(async () => {
      const repositories = setup();
      await runnerFor(repositories).request(input);
      reopened = runnerFor(repositories);
      await reopened.request(input);
      afterFreshCheck = reopened.getState().settledAt!;
    });

    describe('when it finds the cache fresh again', () => {
      beforeAll(async () => {
        await reopened.request(input);
      });

      test('then it keeps the time it first settled', () => {
        expect(reopened.getState().settledAt).toBe(afterFreshCheck);
      });

      test('then it is idle', () => {
        expect(reopened.getState().status).toBe('idle');
      });
    });
  });

  describe('given a runner that has computed passes, with a listener', () => {
    let runner: PassCacheRunner;
    let listener: jest.Mock;

    beforeAll(async () => {
      runner = runnerFor(setup());
      await runner.request(input);
      listener = jest.fn();
      runner.subscribe(listener);
    });

    describe('when the same passes are requested again', () => {
      beforeAll(async () => {
        await runner.request(input);
      });

      test('then it does nothing while the cache is fresh', () => {
        expect(listener).not.toHaveBeenCalled();
      });
    });
  });

  describe('given a runner that has computed passes and was asked again while fresh, with a listener', () => {
    let runner: PassCacheRunner;
    let listener: jest.Mock;

    beforeAll(async () => {
      runner = runnerFor(setup());
      await runner.request(input);
      listener = jest.fn();
      runner.subscribe(listener);
      await runner.request(input);
    });

    describe('when a recompute is forced', () => {
      beforeAll(async () => {
        await runner.request(input, true);
      });

      test('then it computes again', () => {
        expect(listener).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('given a run for 40° held at its first yield to the UI', () => {
    let repositories: Repositories;
    let runner: PassCacheRunner;
    let releaseFirst: () => void;
    let first: Promise<void>;

    beforeAll(() => {
      repositories = setup();
      releaseFirst = () => {};
      let calls = 0;
      runner = createPassCacheRunner(repositories, {
        yieldToUi: () =>
          new Promise<void>((resolve) => {
            calls += 1;
            if (calls === 1) {
              releaseFirst = resolve;
            } else {
              resolve();
            }
          }),
      });
      first = runner.request({ ...input, minElevation: 40 });
    });

    describe('when a newer request for 10° arrives and the first run is released', () => {
      beforeAll(async () => {
        const second = runner.request({ ...input, minElevation: 10 }, true);
        releaseFirst();
        await Promise.all([first, second]);
      });

      test('then the passes stored are for the newer request', () => {
        expect(repositories.syncMeta.get('passes.key')).toContain('|10');
      });

      test('then it is idle', () => {
        expect(runner.getState().status).toBe('idle');
      });
    });
  });

  describe('given a runner whose database cannot store passes', () => {
    let runner: PassCacheRunner;

    beforeAll(() => {
      const repositories = setup();
      runner = createPassCacheRunner(
        {
          ...repositories,
          passes: {
            ...repositories.passes,
            replaceAll: () => {
              throw new Error('disk full');
            },
          },
        },
        { yieldToUi: async () => {} },
      );
    });

    describe('when passes are requested', () => {
      beforeAll(async () => {
        await runner.request(input);
      });

      test('then it reports the error', () => {
        expect(runner.getState()).toMatchObject({ status: 'error', error: new Error('disk full') });
      });
    });
  });
});
