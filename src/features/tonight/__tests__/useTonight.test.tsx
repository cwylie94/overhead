import { useNetInfo } from '@react-native-community/netinfo';
import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import type { UpcomingPass } from '@/data/queries';
import { useDemo, type DemoEnvironment } from '@/demo/session';
import { ClockProvider } from '@/environment/clock';
import { useSettingsStore } from '@/stores/settingsStore';

import { useTonight } from '../useTonight';

const DAY = 24 * 60 * 60_000;
const MOCK_NOW = Date.UTC(2026, 10, 8, 20, 0);
const MOCK_LOADED_AT = MOCK_NOW + 1;
const mockPass = { id: 7, noradId: 25544, name: 'ISS (ZARYA)' } as UpcomingPass;
const mockRefresh = jest.fn<Promise<void>, []>();
const mockRequestPermission = jest.fn<Promise<void>, []>();
let mockFetchedAt: (number | null)[] = [];

jest.mock('@react-native-community/netinfo', () => ({ useNetInfo: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/data/AppDataContext', () => ({ useAppData: () => ({ db: {} }) }));
jest.mock('@/data/queries', () => ({
  upcomingPassesQuery: () => 'passes',
  orbitFreshnessQuery: () => 'freshness',
}));
jest.mock('@/data/liveQuery/useLiveQuery', () => ({
  useLiveQuery: (query: string) =>
    query === 'passes'
      ? { data: [mockPass], loadedAt: MOCK_LOADED_AT }
      : { data: mockFetchedAt.map((fetchedAt) => ({ fetchedAt })), loadedAt: MOCK_LOADED_AT },
}));
jest.mock('@/data/passCache/PassCacheScheduler', () => ({
  usePassCache: () => ({
    state: { status: 'idle', computedAt: MOCK_NOW, settledAt: MOCK_NOW, replacing: false },
    refresh: mockRefresh,
  }),
}));
jest.mock('@/demo/session', () => ({ useDemo: jest.fn() }));
jest.mock('@/environment/location', () => ({
  useLocation: () => ({
    state: { status: 'ready', observer: { latitude: 51.5, longitude: -0.1, altitude: 0 } },
    requestPermission: mockRequestPermission,
  }),
}));
jest.mock('../useReminders', () => ({ useReminders: () => null }));

const CHOSEN = { name: 'Madrid', country: 'Spain', latitude: 40.4, longitude: -3.7 };
const DEMO = { startsAt: MOCK_NOW - 60_000 } as DemoEnvironment;

function wrapper({ children }: { children: ReactNode }) {
  return <ClockProvider clock={{ now: () => MOCK_NOW }}>{children}</ClockProvider>;
}

async function renderTonight() {
  return renderHook(() => useTonight(), { wrapper });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchedAt = [MOCK_NOW - DAY];
  mockRefresh.mockResolvedValue();
  mockRequestPermission.mockResolvedValue();
  jest.mocked(useDemo).mockReturnValue(null);
  jest.mocked(useNetInfo).mockReturnValue({ isConnected: true } as ReturnType<typeof useNetInfo>);
  useSettingsStore.setState({ customLocation: null });
});

describe('useTonight', () => {
  test('lists the cached passes once they have caught up with the pass cache', async () => {
    const { result } = await renderTonight();

    expect(result.current).toMatchObject({
      passes: [mockPass],
      now: MOCK_NOW,
      computing: false,
      stale: false,
      offline: false,
      staleDays: null,
      demoStartsAt: null,
      refreshing: false,
    });
  });

  test('says when the phone is offline', async () => {
    jest
      .mocked(useNetInfo)
      .mockReturnValue({ isConnected: false } as ReturnType<typeof useNetInfo>);

    const { result } = await renderTonight();

    expect(result.current.offline).toBe(true);
  });

  test('warns about orbit data that is several days old', async () => {
    mockFetchedAt = [MOCK_NOW - 5 * DAY, MOCK_NOW - DAY];

    const { result } = await renderTonight();

    expect(result.current.staleDays).toBe(5);
  });

  test('shows the chosen city', async () => {
    useSettingsStore.setState({ customLocation: CHOSEN });

    const { result } = await renderTonight();

    expect(result.current.chosenLocation).toEqual(CHOSEN);
  });

  test('hides the offline, stale and chosen-city banners in demo mode', async () => {
    jest.mocked(useDemo).mockReturnValue(DEMO);
    jest
      .mocked(useNetInfo)
      .mockReturnValue({ isConnected: false } as ReturnType<typeof useNetInfo>);
    mockFetchedAt = [MOCK_NOW - 5 * DAY];
    useSettingsStore.setState({ customLocation: CHOSEN });

    const { result } = await renderTonight();

    expect(result.current).toMatchObject({
      offline: false,
      staleDays: null,
      chosenLocation: null,
      demoStartsAt: DEMO.startsAt,
    });
  });

  test('shows the pull-to-refresh spinner until the passes are recomputed', async () => {
    let finish!: () => void;
    mockRefresh.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result } = await renderTonight();

    await act(async () => result.current.onRefresh());
    expect(result.current.refreshing).toBe(true);

    await act(async () => finish());
    expect(result.current.refreshing).toBe(false);
  });

  test('stops the spinner when recomputing fails', async () => {
    mockRefresh.mockRejectedValue(new Error('no location'));
    const { result } = await renderTonight();

    await act(async () => result.current.onRefresh());

    expect(result.current.refreshing).toBe(false);
  });

  test('opens catch mode, the satellite card and the city picker', async () => {
    const { result } = await renderTonight();

    result.current.onCatch(mockPass);
    result.current.onOpenSatellite(mockPass);
    result.current.onChooseCity();

    expect(jest.mocked(router.push).mock.calls).toEqual([
      ['/catch/7'],
      ['/satellite/25544'],
      ['/location'],
    ]);
  });

  test('asks for location permission', async () => {
    mockRequestPermission.mockRejectedValue(new Error('denied'));
    const { result } = await renderTonight();

    result.current.onAllowLocation();

    expect(mockRequestPermission).toHaveBeenCalled();
  });
});
