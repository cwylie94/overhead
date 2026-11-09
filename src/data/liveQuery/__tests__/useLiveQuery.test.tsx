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

beforeEach(() => {
  mockListeners.clear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('useLiveQuery', () => {
  test('loads once on mount', async () => {
    const { query, then } = fakeQuery([[{ id: 1 }]]);
    const { result } = await renderHook(() => useLiveQuery(query));

    expect(then).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([{ id: 1 }]);
    expect(result.current.loadedAt).not.toBeNull();
  });

  test('reloads once after a burst of row changes, not once per row', async () => {
    const { query, then } = fakeQuery([[], [{ id: 2 }]]);
    const { result } = await renderHook(() => useLiveQuery(query));
    const firstLoad = result.current.loadedAt!;

    await act(async () => {
      for (let row = 0; row < 400; row++) {
        change('passes');
      }
      jest.advanceTimersByTime(LIVE_QUERY_SETTLE_MS);
    });

    expect(then).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual([{ id: 2 }]);
    expect(result.current.loadedAt).toBeGreaterThan(firstLoad);
  });

  test('ignores changes to other tables', async () => {
    const { query, then } = fakeQuery([[]]);
    await renderHook(() => useLiveQuery(query));

    await act(async () => {
      change('orbits');
      jest.advanceTimersByTime(LIVE_QUERY_SETTLE_MS);
    });

    expect(then).toHaveBeenCalledTimes(1);
  });

  test('stops listening when unmounted', async () => {
    const { query, then } = fakeQuery([[]]);
    const { unmount } = await renderHook(() => useLiveQuery(query));

    await act(async () => unmount());
    change('passes');
    jest.advanceTimersByTime(LIVE_QUERY_SETTLE_MS);

    expect(mockListeners.size).toBe(0);
    expect(then).toHaveBeenCalledTimes(1);
  });
});
