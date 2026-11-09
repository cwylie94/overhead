import { useOrbitRefreshStore } from '../orbitRefreshStore';
import { storeStorage } from '../storage';

beforeEach(() => {
  storeStorage.clearAll();
  useOrbitRefreshStore.setState(useOrbitRefreshStore.getInitialState());
});

describe('orbit refresh store', () => {
  test('records when a check finished and whether it failed', () => {
    const store = useOrbitRefreshStore.getState();

    store.checkStarted();
    expect(useOrbitRefreshStore.getState().status).toBe('checking');

    store.checkFinished(1_000, true);
    expect(useOrbitRefreshStore.getState()).toMatchObject({
      status: 'failed',
      lastCheckedAt: 1_000,
    });

    store.checkStarted();
    store.checkFinished(2_000, false);
    expect(useOrbitRefreshStore.getState()).toMatchObject({ status: 'idle', lastCheckedAt: 2_000 });
  });

  test('ignores a finish without a start and a second start', () => {
    const before = useOrbitRefreshStore.getState();
    before.checkFinished(1_000, false);
    expect(useOrbitRefreshStore.getState()).toBe(before);

    useOrbitRefreshStore.getState().checkStarted();
    const checking = useOrbitRefreshStore.getState();
    checking.checkStarted();
    expect(useOrbitRefreshStore.getState()).toBe(checking);
  });

  test('saves only the last check time', () => {
    useOrbitRefreshStore.getState().checkStarted();
    useOrbitRefreshStore.getState().checkFinished(5_000, false);

    expect(JSON.parse(storeStorage.getString('orbitRefresh') ?? 'null')).toEqual({
      version: 1,
      state: { lastCheckedAt: 5_000 },
    });
  });
});
