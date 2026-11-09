import { act, renderHook } from '@testing-library/react-native';
import type { DatabaseChangeEvent } from 'expo-sqlite';

import { passes } from '../../schema';
import { LIVE_QUERY_SETTLE_MS, useLiveQuery } from '../useLiveQuery';

const mockListeners = new Set<(event: DatabaseChangeEvent) => void>();

jest.mock('expo-sqlite', () => ({
  addDatabaseChangeListener: (listener: (event: DatabaseChangeEvent) => void) => {
    mockListeners.add(listener);
    return { remove: () => mockListeners.delete(listener) };
  },
}));

function change(tableName: string) {
  for (const listener of mockListeners) {
    listener({ databaseName: 'main', databaseFilePath: 'overhead.db', tableName, rowId: 1 });
  }
}

function fakeQuery(results: unknown[][]) {
  let call = 0;
  const then = jest.fn((resolve: (rows: unknown[]) => void) => {
    resolve(results[Math.min(call, results.length - 1)]!);
    call += 1;
    return Promise.resolve();
  });
  return { query: { _: {}, then, config: { table: passes } } as never, then };
}

function mountLiveQuery(query: never) {
  return renderHook(() => useLiveQuery(query));
}

type LiveQueryHook = Awaited<ReturnType<typeof mountLiveQuery>>;

beforeEach(() => {
  mockListeners.clear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('useLiveQuery', () => {
  describe('given a query that returns one row', () => {
    let fake: ReturnType<typeof fakeQuery>;

    beforeEach(() => {
      fake = fakeQuery([[{ id: 1 }]]);
    });

    describe('when the hook mounts', () => {
      let hook: LiveQueryHook;

      beforeEach(async () => {
        hook = await mountLiveQuery(fake.query);
      });

      test('then it loads once', () => {
        expect(fake.then).toHaveBeenCalledTimes(1);
      });

      test('then it returns the row', () => {
        expect(hook.result.current.data).toEqual([{ id: 1 }]);
      });

      test('then it records when it loaded', () => {
        expect(hook.result.current.loadedAt).not.toBeNull();
      });
    });
  });

  describe('given the hook has loaded no passes and the next load returns one', () => {
    let fake: ReturnType<typeof fakeQuery>;
    let hook: LiveQueryHook;
    let firstLoad: number;

    beforeEach(async () => {
      fake = fakeQuery([[], [{ id: 2 }]]);
      hook = await mountLiveQuery(fake.query);
      firstLoad = hook.result.current.loadedAt!;
    });

    describe('when a burst of 400 pass rows changes and settles', () => {
      beforeEach(async () => {
        await act(async () => {
          for (let row = 0; row < 400; row++) {
            change('passes');
          }
          jest.advanceTimersByTime(LIVE_QUERY_SETTLE_MS);
        });
      });

      test('then it reloads once, not once per row', () => {
        expect(fake.then).toHaveBeenCalledTimes(2);
      });

      test('then it returns the new rows', () => {
        expect(hook.result.current.data).toEqual([{ id: 2 }]);
      });

      test('then it records a later load time', () => {
        expect(hook.result.current.loadedAt).toBeGreaterThan(firstLoad);
      });
    });
  });

  describe('given the hook has loaded the passes', () => {
    let fake: ReturnType<typeof fakeQuery>;

    beforeEach(async () => {
      fake = fakeQuery([[]]);
      await mountLiveQuery(fake.query);
    });

    describe('when another table changes and settles', () => {
      beforeEach(async () => {
        await act(async () => {
          change('orbits');
          jest.advanceTimersByTime(LIVE_QUERY_SETTLE_MS);
        });
      });

      test('then it does not reload', () => {
        expect(fake.then).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given the hook loaded the passes and then unmounted', () => {
    let fake: ReturnType<typeof fakeQuery>;

    beforeEach(async () => {
      fake = fakeQuery([[]]);
      const { unmount } = await mountLiveQuery(fake.query);
      await act(async () => unmount());
    });

    describe('when a pass row changes and settles', () => {
      beforeEach(() => {
        change('passes');
        jest.advanceTimersByTime(LIVE_QUERY_SETTLE_MS);
      });

      test('then it no longer listens for changes', () => {
        expect(mockListeners.size).toBe(0);
      });

      test('then it does not reload', () => {
        expect(fake.then).toHaveBeenCalledTimes(1);
      });
    });
  });
});
