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
    expect(runner.getState()).toEqual({ status: 'idle', computedAt: input.now });
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
