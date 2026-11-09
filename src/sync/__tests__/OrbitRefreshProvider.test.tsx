import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { act, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { AppDataProvider } from '@/data/AppDataContext';
import type { AppData } from '@/data/client';
import { ClockProvider } from '@/environment/clock';
import { useOrbitRefreshStore } from '@/stores/orbitRefreshStore';

import { refreshOrbits, type RefreshOutcome } from '../celestrak';
import { OrbitRefreshProvider } from '../OrbitRefreshProvider';

const mockRefreshPasses = jest.fn(async () => {});
let networkListener: ((state: Pick<NetInfoState, 'isConnected'>) => void) | null = null;
const unsubscribeNetwork = jest.fn();

jest.mock('@/session/PassCacheProvider', () => ({
  usePassCache: () => ({ refresh: mockRefreshPasses }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
}));

jest.mock('../celestrak', () => ({
  ...jest.requireActual('../celestrak'),
  httpOrbitFetcher: () => async () => [],
  refreshOrbits: jest.fn(),
}));

const NOW = Date.UTC(2026, 10, 9, 21, 0);
const FRESH: Record<string, RefreshOutcome> = { visual: 'fresh', stations: 'fresh' };
const UPDATED: Record<string, RefreshOutcome> = { visual: 'updated', stations: 'fresh' };
const FAILED: Record<string, RefreshOutcome> = { visual: 'failed', stations: 'fresh' };

let appStateListener: ((state: AppStateStatus) => void) | null = null;
const removeAppState = jest.fn();

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

async function renderProvider(enabled = true) {
  const data = { key: 'test', repositories: {} } as unknown as AppData;
  return render(
    <ClockProvider clock={{ now: () => NOW }}>
      <AppDataProvider data={data}>
        <OrbitRefreshProvider enabled={enabled}>{null}</OrbitRefreshProvider>
      </AppDataProvider>
    </ClockProvider>,
  );
}

async function settle() {
  await act(async () => {});
}

async function launch(enabled = true) {
  const rendered = await renderProvider(enabled);
  await settle();
  return rendered;
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
  useOrbitRefreshStore.setState(useOrbitRefreshStore.getInitialState());
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

describe('OrbitRefreshProvider', () => {
  describe('given CelesTrak has nothing new', () => {
    beforeEach(() => {
      checkWillReturn(FRESH);
    });

    describe('when the app launches', () => {
      beforeEach(async () => {
        await launch();
      });

      test('then it checks for new orbits', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(1);
      });

      test('then it records when it checked', () => {
        expect(useOrbitRefreshStore.getState()).toMatchObject({
          status: 'idle',
          lastCheckedAt: NOW,
        });
      });

      test('then it leaves the passes alone', () => {
        expect(mockRefreshPasses).not.toHaveBeenCalled();
      });
    });
  });

  describe('given a check that has not finished yet', () => {
    beforeEach(() => {
      checkWillWait();
    });

    describe('when the app launches', () => {
      beforeEach(async () => {
        await renderProvider();
      });

      test('then it shows that a check is running', () => {
        expect(useOrbitRefreshStore.getState().status).toBe('checking');
      });
    });
  });

  describe('given the app launched while a check was running', () => {
    let run: ReturnType<typeof checkWillWait>;

    beforeEach(async () => {
      run = checkWillWait();
      await renderProvider();
    });

    describe('when the check finishes', () => {
      beforeEach(async () => {
        await act(async () => run.resolve(FRESH));
      });

      test('then it shows that no check is running', () => {
        expect(useOrbitRefreshStore.getState().status).toBe('idle');
      });
    });

    describe('when the app returns to the foreground', () => {
      beforeEach(async () => {
        await act(async () => appStateListener!('active'));
      });

      test('then it does not start a second check', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given an orbit group will be updated', () => {
    beforeEach(() => {
      checkWillReturn(UPDATED);
    });

    describe('when the app launches', () => {
      beforeEach(async () => {
        await launch();
      });

      test('then it recomputes the passes', () => {
        expect(mockRefreshPasses).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given an orbit group will fail', () => {
    beforeEach(() => {
      checkWillReturn(FAILED);
    });

    describe('when the app launches', () => {
      beforeEach(async () => {
        await launch();
      });

      test('then it records the failure and when it checked', () => {
        expect(useOrbitRefreshStore.getState()).toMatchObject({
          status: 'failed',
          lastCheckedAt: NOW,
        });
      });
    });
  });

  describe('given the check will throw', () => {
    beforeEach(() => {
      jest.mocked(refreshOrbits).mockRejectedValue(new Error('offline'));
    });

    describe('when the app launches', () => {
      beforeEach(async () => {
        await launch();
      });

      test('then it records the check as failed', () => {
        expect(useOrbitRefreshStore.getState().status).toBe('failed');
      });
    });
  });

  describe('given the app launched and checked for orbits', () => {
    let unmount: Awaited<ReturnType<typeof renderProvider>>['unmount'];

    beforeEach(async () => {
      checkWillReturn(FRESH);
      ({ unmount } = await launch());
    });

    describe('when the app goes to the background', () => {
      beforeEach(async () => {
        await act(async () => appStateListener!('background'));
      });

      test('then it does not check again', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the first network report arrives', () => {
      beforeEach(async () => {
        await act(async () => networkListener!({ isConnected: true }));
      });

      test('then it does not check again', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the provider unmounts', () => {
      beforeEach(async () => {
        await act(async () => unmount());
      });

      test('then it stops listening for network changes', () => {
        expect(unsubscribeNetwork).toHaveBeenCalled();
      });

      test('then it stops listening for the app going to the foreground', () => {
        expect(removeAppState).toHaveBeenCalled();
      });
    });
  });

  describe('given the app launched, checked for orbits and went to the background', () => {
    beforeEach(async () => {
      checkWillReturn(FRESH);
      await launch();
      await act(async () => appStateListener!('background'));
    });

    describe('when the app returns to the foreground', () => {
      beforeEach(async () => {
        await act(async () => appStateListener!('active'));
      });

      test('then it checks again', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('given the app returned to the foreground during the launch check, which then finished', () => {
    beforeEach(async () => {
      const run = checkWillWait();
      await renderProvider();
      await act(async () => appStateListener!('active'));
      await act(async () => run.resolve(FRESH));
      checkWillReturn(FRESH);
    });

    describe('when the app returns to the foreground again', () => {
      beforeEach(async () => {
        await act(async () => appStateListener!('active'));
      });

      test('then it checks again', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('given the app launched and checked, then the network was reported connected and then lost', () => {
    beforeEach(async () => {
      checkWillReturn(FRESH);
      await launch();
      await act(async () => networkListener!({ isConnected: true }));
      await act(async () => networkListener!({ isConnected: false }));
    });

    describe('when the network reconnects', () => {
      beforeEach(async () => {
        await act(async () => networkListener!({ isConnected: true }));
      });

      test('then it checks again', () => {
        expect(refreshOrbits).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('given demo mode is on', () => {
    beforeEach(() => {
      checkWillReturn(FRESH);
    });

    describe('when the app launches', () => {
      beforeEach(async () => {
        await launch(false);
      });

      test('then it does not check for orbits', () => {
        expect(refreshOrbits).not.toHaveBeenCalled();
      });

      test('then it does not listen for the network', () => {
        expect(NetInfo.addEventListener).not.toHaveBeenCalled();
      });

      test('then it shows that no check is running', () => {
        expect(useOrbitRefreshStore.getState().status).toBe('idle');
      });
    });
  });
});
