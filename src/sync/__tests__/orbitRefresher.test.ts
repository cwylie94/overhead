import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';

import { refreshOrbits, type RefreshOutcome, type RefreshRepositories } from '../celestrak';
import { createOrbitRefresher, type OrbitRefresher, type RefreshStatus } from '../orbitRefresher';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
}));

jest.mock('../celestrak', () => ({
  ...jest.requireActual('../celestrak'),
  refreshOrbits: jest.fn(),
}));

const NOW = Date.UTC(2026, 10, 9, 21, 0);
const FRESH: Record<string, RefreshOutcome> = { visual: 'fresh', stations: 'fresh' };
const UPDATED: Record<string, RefreshOutcome> = { visual: 'updated', stations: 'fresh' };
const FAILED: Record<string, RefreshOutcome> = { visual: 'failed', stations: 'fresh' };

const onOrbitsChanged = jest.fn(async () => {});
const unsubscribeNetwork = jest.fn();
const removeAppState = jest.fn();
let networkListener: ((state: Pick<NetInfoState, 'isConnected'>) => void) | null = null;
let appStateListener: ((state: AppStateStatus) => void) | null = null;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

function newRefresher() {
  return createOrbitRefresher({
    repositories: {} as RefreshRepositories,
    fetchOrbits: async () => [],
    clock: { now: () => NOW },
    onOrbitsChanged,
  });
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
}

async function launch() {
  const refresher = newRefresher();
  const stop = refresher.start();
  await settle();
  return { refresher, stop };
}

function checkWillReturn(outcomes: Record<string, RefreshOutcome>) {
  jest.mocked(refreshOrbits).mockResolvedValue(outcomes);
}

function checkWillWait() {
  const run = deferred<Record<string, RefreshOutcome>>();
  jest.mocked(refreshOrbits).mockReturnValue(run.promise);
  return run;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(refreshOrbits).mockResolvedValue(FRESH);
  jest.mocked(NetInfo.addEventListener).mockImplementation((listener) => {
    networkListener = listener as typeof networkListener;
    return unsubscribeNetwork;
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    appStateListener = listener;
    return { remove: removeAppState };
  });
});

describe('createOrbitRefresher', () => {
  describe('given a new refresher', () => {
    let refresher: OrbitRefresher;

    beforeEach(() => {
      refresher = newRefresher();
    });

    test('then no check is running', () => {
      expect(refresher.getStatus()).toBe('idle');
    });

    test('then it has not checked for orbits', () => {
      expect(refreshOrbits).not.toHaveBeenCalled();
    });

    test('then it does not listen for the network', () => {
      expect(NetInfo.addEventListener).not.toHaveBeenCalled();
    });
  });

  describe('given CelesTrak has nothing new', () => {
    beforeEach(() => {
      checkWillReturn(FRESH);
    });

    describe('when the refresher starts', () => {
      let refresher: OrbitRefresher;

      beforeEach(async () => {
        ({ refresher } = await launch());
      });

      test('then it checks for new orbits at the current time', () => {
        expect(jest.mocked(refreshOrbits).mock.calls).toEqual([[{}, expect.any(Function), NOW]]);
      });

      test('then it shows that no check is running', () => {
        expect(refresher.getStatus()).toBe('idle');
      });

      test('then it leaves the passes alone', () => {
        expect(onOrbitsChanged).not.toHaveBeenCalled();
      });
    });
  });

  describe('given a check that has not finished yet, with a listener', () => {
    let refresher: OrbitRefresher;
    let seen: RefreshStatus[];

    beforeEach(() => {
      checkWillWait();
      refresher = newRefresher();
      seen = [];
      refresher.subscribe(() => seen.push(refresher.getStatus()));
    });

    describe('when the refresher starts', () => {
      beforeEach(() => {
        refresher.start();
      });

      test('then it shows that a check is running', () => {
        expect(seen).toEqual(['checking']);
      });
    });
  });

  describe('given the refresher started while a check was running', () => {
    let refresher: OrbitRefresher;
    let run: ReturnType<typeof checkWillWait>;

    beforeEach(() => {
      run = checkWillWait();
      refresher = newRefresher();
      refresher.start();
    });

    describe('when the check finishes', () => {
      beforeEach(async () => {
        run.resolve(FRESH);
        await settle();
      });

      test('then it shows that no check is running', () => {
        expect(refresher.getStatus()).toBe('idle');
      });
    });

    describe('when the app returns to the foreground', () => {
      beforeEach(() => {
        appStateListener!('active');
      });

      test('then it does not start a second check', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(1);
      });
    });

    describe('when asked to refresh', () => {
      let second: Promise<void>;
      let first: Promise<void>;

      beforeEach(() => {
        first = refresher.refresh();
        second = refresher.refresh();
      });

      test('then it joins the running check', () => {
        expect(second).toBe(first);
      });
    });
  });

  describe('given an orbit group will be updated', () => {
    beforeEach(() => {
      checkWillReturn(UPDATED);
    });

    describe('when the refresher starts', () => {
      beforeEach(async () => {
        await launch();
      });

      test('then it recomputes the passes', () => {
        expect(onOrbitsChanged).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given an orbit group will fail', () => {
    beforeEach(() => {
      checkWillReturn(FAILED);
    });

    describe('when the refresher starts', () => {
      let refresher: OrbitRefresher;

      beforeEach(async () => {
        ({ refresher } = await launch());
      });

      test('then it records the failure', () => {
        expect(refresher.getStatus()).toBe('failed');
      });
    });
  });

  describe('given the check will throw', () => {
    beforeEach(() => {
      jest.mocked(refreshOrbits).mockRejectedValue(new Error('offline'));
    });

    describe('when the refresher starts', () => {
      let refresher: OrbitRefresher;

      beforeEach(async () => {
        ({ refresher } = await launch());
      });

      test('then it records the check as failed', () => {
        expect(refresher.getStatus()).toBe('failed');
      });

      test('then it leaves the passes alone', () => {
        expect(onOrbitsChanged).not.toHaveBeenCalled();
      });
    });
  });

  describe('given the refresher started and checked for orbits', () => {
    let stop: () => void;

    beforeEach(async () => {
      checkWillReturn(FRESH);
      ({ stop } = await launch());
    });

    describe('when the app goes to the background', () => {
      beforeEach(() => {
        appStateListener!('background');
      });

      test('then it does not check again', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the first network report arrives', () => {
      beforeEach(() => {
        networkListener!({ isConnected: true });
      });

      test('then it does not check again', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the refresher stops', () => {
      beforeEach(() => {
        stop();
      });

      test('then it stops listening for network changes', () => {
        expect(unsubscribeNetwork).toHaveBeenCalled();
      });

      test('then it stops listening for the app going to the foreground', () => {
        expect(removeAppState).toHaveBeenCalled();
      });
    });
  });

  describe('given the refresher started, checked for orbits and the app went to the background', () => {
    beforeEach(async () => {
      checkWillReturn(FRESH);
      await launch();
      appStateListener!('background');
    });

    describe('when the app returns to the foreground', () => {
      beforeEach(async () => {
        appStateListener!('active');
        await settle();
      });

      test('then it checks again', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('given the app returned to the foreground during the launch check, which then finished', () => {
    beforeEach(async () => {
      const run = checkWillWait();
      newRefresher().start();
      appStateListener!('active');
      run.resolve(FRESH);
      await settle();
      checkWillReturn(FRESH);
    });

    describe('when the app returns to the foreground again', () => {
      beforeEach(async () => {
        appStateListener!('active');
        await settle();
      });

      test('then it checks again', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('given the refresher checked, then the network was reported connected and then lost', () => {
    beforeEach(async () => {
      checkWillReturn(FRESH);
      await launch();
      networkListener!({ isConnected: true });
      networkListener!({ isConnected: false });
    });

    describe('when the network reconnects', () => {
      beforeEach(async () => {
        networkListener!({ isConnected: true });
        await settle();
      });

      test('then it checks again', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('given a listener that has unsubscribed', () => {
    let listener: jest.Mock;

    beforeEach(() => {
      const refresher = newRefresher();
      listener = jest.fn();
      refresher.subscribe(listener)();
      refresher.refresh();
    });

    test('then it is not told about the check', () => {
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
