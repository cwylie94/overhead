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

jest.mock('@/data/passCache/PassCacheScheduler', () => ({
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
  test('checks for new orbits on launch and records when it did', async () => {
    await renderProvider();
    await settle();

    expect(refreshOrbits).toHaveBeenCalledTimes(1);
    expect(useOrbitRefreshStore.getState()).toMatchObject({ status: 'idle', lastCheckedAt: NOW });
    expect(mockRefreshPasses).not.toHaveBeenCalled();
  });

  test('shows that a check is running', async () => {
    const run = deferred<Record<string, RefreshOutcome>>();
    jest.mocked(refreshOrbits).mockReturnValue(run.promise);

    await renderProvider();

    expect(useOrbitRefreshStore.getState().status).toBe('checking');
    await act(async () => run.resolve(FRESH));
    expect(useOrbitRefreshStore.getState().status).toBe('idle');
  });

  test('recomputes the passes when an orbit group was updated', async () => {
    jest.mocked(refreshOrbits).mockResolvedValue(UPDATED);

    await renderProvider();
    await settle();

    expect(mockRefreshPasses).toHaveBeenCalledTimes(1);
  });

  test('records a failed group', async () => {
    jest.mocked(refreshOrbits).mockResolvedValue(FAILED);

    await renderProvider();
    await settle();

    expect(useOrbitRefreshStore.getState()).toMatchObject({
      status: 'failed',
      lastCheckedAt: NOW,
    });
  });

  test('records a refresh that throws as failed', async () => {
    jest.mocked(refreshOrbits).mockRejectedValue(new Error('offline'));

    await renderProvider();
    await settle();

    expect(useOrbitRefreshStore.getState().status).toBe('failed');
  });

  test('checks again on returning to the foreground', async () => {
    await renderProvider();
    await settle();

    await act(async () => appStateListener!('background'));
    expect(refreshOrbits).toHaveBeenCalledTimes(1);
    await act(async () => appStateListener!('active'));

    expect(refreshOrbits).toHaveBeenCalledTimes(2);
  });

  test('runs one check at a time', async () => {
    const run = deferred<Record<string, RefreshOutcome>>();
    jest.mocked(refreshOrbits).mockReturnValue(run.promise);
    await renderProvider();

    await act(async () => appStateListener!('active'));
    expect(refreshOrbits).toHaveBeenCalledTimes(1);

    await act(async () => run.resolve(FRESH));
    jest.mocked(refreshOrbits).mockResolvedValue(FRESH);
    await act(async () => appStateListener!('active'));
    expect(refreshOrbits).toHaveBeenCalledTimes(2);
  });

  test('checks again on reconnecting, but not on the first network report', async () => {
    await renderProvider();
    await settle();

    await act(async () => networkListener!({ isConnected: true }));
    expect(refreshOrbits).toHaveBeenCalledTimes(1);

    await act(async () => networkListener!({ isConnected: false }));
    await act(async () => networkListener!({ isConnected: true }));
    expect(refreshOrbits).toHaveBeenCalledTimes(2);
  });

  test('does nothing in demo mode', async () => {
    await renderProvider(false);
    await settle();

    expect(refreshOrbits).not.toHaveBeenCalled();
    expect(NetInfo.addEventListener).not.toHaveBeenCalled();
    expect(useOrbitRefreshStore.getState().status).toBe('idle');
  });

  test('stops listening when it unmounts', async () => {
    const { unmount } = await renderProvider();
    await settle();

    await act(async () => unmount());

    expect(unsubscribeNetwork).toHaveBeenCalled();
    expect(removeAppState).toHaveBeenCalled();
  });
});
