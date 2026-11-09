import { useOrbitRefreshStore } from '../orbitRefreshStore';
import { storeStorage } from '../storage';

type OrbitRefreshStore = ReturnType<typeof useOrbitRefreshStore.getState>;

beforeEach(() => {
  storeStorage.clearAll();
  useOrbitRefreshStore.setState(useOrbitRefreshStore.getInitialState());
});

describe('useOrbitRefreshStore', () => {
  describe('given no check is running', () => {
    let before: OrbitRefreshStore;

    beforeEach(() => {
      before = useOrbitRefreshStore.getState();
    });

    describe('when a check starts', () => {
      beforeEach(() => {
        before.checkStarted();
      });

      test('then it is checking', () => {
        expect(useOrbitRefreshStore.getState().status).toBe('checking');
      });
    });

    describe('when a check finishes without having started', () => {
      beforeEach(() => {
        before.checkFinished(1_000, false);
      });

      test('then it is ignored', () => {
        expect(useOrbitRefreshStore.getState()).toBe(before);
      });
    });
  });

  describe('given a check is running', () => {
    let checking: OrbitRefreshStore;

    beforeEach(() => {
      useOrbitRefreshStore.getState().checkStarted();
      checking = useOrbitRefreshStore.getState();
    });

    describe('when the check fails', () => {
      beforeEach(() => {
        checking.checkFinished(1_000, true);
      });

      test('then it records the failure and when the check finished', () => {
        expect(useOrbitRefreshStore.getState()).toMatchObject({
          status: 'failed',
          lastCheckedAt: 1_000,
        });
      });
    });

    describe('when a second check starts', () => {
      beforeEach(() => {
        checking.checkStarted();
      });

      test('then it is ignored', () => {
        expect(useOrbitRefreshStore.getState()).toBe(checking);
      });
    });

    describe('when the check succeeds', () => {
      beforeEach(() => {
        checking.checkFinished(5_000, false);
      });

      test('then it saves only the last check time', () => {
        expect(JSON.parse(storeStorage.getString('orbitRefresh') ?? 'null')).toEqual({
          version: 1,
          state: { lastCheckedAt: 5_000 },
        });
      });
    });
  });

  describe('given a check failed and another has started', () => {
    beforeEach(() => {
      const store = useOrbitRefreshStore.getState();
      store.checkStarted();
      store.checkFinished(1_000, true);
      store.checkStarted();
    });

    describe('when the new check succeeds', () => {
      beforeEach(() => {
        useOrbitRefreshStore.getState().checkFinished(2_000, false);
      });

      test('then it is idle with the new check time', () => {
        expect(useOrbitRefreshStore.getState()).toMatchObject({
          status: 'idle',
          lastCheckedAt: 2_000,
        });
      });
    });
  });
});
