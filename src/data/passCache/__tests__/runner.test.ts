import { london, skyfield } from '@/domain/testing/skyfieldFixture';

import { createRepositories } from '../../repositories';
import { bundledSnapshot, importSnapshot } from '../../snapshot';
import { createTestDatabase } from '../../testing/createTestDatabase';
import { createPassCacheRunner } from '../runner';

const input = { observer: london, minElevation: 10, now: skyfield.window.start };

function setup() {
  const repositories = createRepositories(createTestDatabase());
  importSnapshot(repositories, bundledSnapshot);
  return repositories;
}

describe('pass cache runner', () => {
  test('reports computing then idle with the time it computed for', async () => {
    const runner = createPassCacheRunner(setup(), { yieldToUi: async () => {} });
    const seen: string[] = [];
    runner.subscribe(() => seen.push(runner.getState().status));

    await runner.request(input);

    expect(seen).toEqual(['computing', 'idle']);
    expect(runner.getState()).toMatchObject({ status: 'idle', computedAt: input.now });
  });

  test('says a run replaces the list when the place or orbits differ from what is stored', async () => {
    const runner = createPassCacheRunner(setup(), { yieldToUi: async () => {} });
    const replacing: boolean[] = [];
    runner.subscribe(() => replacing.push(runner.getState().replacing));

    await runner.request(input);
    await runner.request(input, true);
    await runner.request({ ...input, observer: { ...input.observer, latitude: 64.1 } });

    expect(replacing).toEqual([true, true, false, false, true, true]);
  });

  test('marks each finished run, and a fresh cache once, as settled', async () => {
    const repositories = setup();
    const first = createPassCacheRunner(repositories, { yieldToUi: async () => {} });
    await first.request(input);
    const afterRun = first.getState().settledAt!;

    const reopened = createPassCacheRunner(repositories, { yieldToUi: async () => {} });
    expect(reopened.getState().settledAt).toBeNull();
    await reopened.request(input);
    const afterFreshCheck = reopened.getState().settledAt!;
    await reopened.request(input);

    expect(afterFreshCheck).toBeGreaterThan(afterRun);
    expect(reopened.getState().settledAt).toBe(afterFreshCheck);
    expect(reopened.getState().status).toBe('idle');
  });

  test('does nothing while the cache is fresh, unless forced', async () => {
    const runner = createPassCacheRunner(setup(), { yieldToUi: async () => {} });
    await runner.request(input);
    const listener = jest.fn();
    runner.subscribe(listener);

    await runner.request(input);
    expect(listener).not.toHaveBeenCalled();

    await runner.request(input, true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('a newer request cancels one still running', async () => {
    const repositories = setup();
    let releaseFirst: () => void = () => {};
    let calls = 0;
    const runner = createPassCacheRunner(repositories, {
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

    const first = runner.request({ ...input, minElevation: 40 });
    const second = runner.request({ ...input, minElevation: 10 }, true);
    releaseFirst();
    await Promise.all([first, second]);

    expect(repositories.syncMeta.get('passes.key')).toContain('|10');
    expect(runner.getState().status).toBe('idle');
  });

  test('reports errors', async () => {
    const repositories = setup();
    const runner = createPassCacheRunner(
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

    await runner.request(input);

    expect(runner.getState()).toMatchObject({ status: 'error', error: new Error('disk full') });
  });
});
