import { storeStorage } from '../storage';
import { useSyncStore } from '../syncStore';

const NOW = Date.UTC(2026, 10, 8, 22);

beforeEach(() => {
  storeStorage.clearAll();
  useSyncStore.setState(useSyncStore.getInitialState());
});

describe('sync store', () => {
  test('a successful sync records the time and clears the last error', () => {
    const store = useSyncStore.getState();

    store.syncStarted();
    store.syncFailed('Network request failed');
    expect(useSyncStore.getState()).toMatchObject({
      status: 'error',
      lastError: 'Network request failed',
    });

    store.syncStarted();
    expect(useSyncStore.getState().status).toBe('syncing');

    store.syncSucceeded(NOW);
    expect(useSyncStore.getState()).toMatchObject({
      status: 'idle',
      lastSyncedAt: NOW,
      lastError: null,
    });
  });

  test('success or failure without a running sync is ignored', () => {
    useSyncStore.getState().syncSucceeded(NOW);
    useSyncStore.getState().syncFailed('stray');

    expect(useSyncStore.getState()).toMatchObject({
      status: 'idle',
      lastSyncedAt: null,
      lastError: null,
    });
  });

  test('saves only the last sync time', () => {
    useSyncStore.getState().syncStarted();
    useSyncStore.getState().syncSucceeded(NOW);

    expect(JSON.parse(storeStorage.getString('sync') ?? 'null')).toEqual({
      version: 1,
      state: { lastSyncedAt: NOW },
    });
  });
});
