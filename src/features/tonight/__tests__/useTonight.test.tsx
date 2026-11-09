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

type HookResult = Awaited<ReturnType<typeof renderTonight>>['result'];

function wrapper({ children }: { children: ReactNode }) {
  return <ClockProvider clock={{ now: () => MOCK_NOW }}>{children}</ClockProvider>;
}

async function renderTonight() {
  return renderHook(() => useTonight(), { wrapper });
}

function setOnline(isConnected: boolean) {
  jest.mocked(useNetInfo).mockReturnValue({ isConnected } as ReturnType<typeof useNetInfo>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchedAt = [MOCK_NOW - DAY];
  mockRefresh.mockResolvedValue();
  mockRequestPermission.mockResolvedValue();
  jest.mocked(useDemo).mockReturnValue(null);
  setOnline(true);
  useSettingsStore.setState({ customLocation: null });
});

describe('useTonight', () => {
  let result: HookResult;

  describe('given the cached passes have caught up with the pass cache, online, with day-old orbit data', () => {
    beforeEach(() => {
      mockFetchedAt = [MOCK_NOW - DAY];
      setOnline(true);
    });

    describe('when the hook renders', () => {
      beforeEach(async () => {
        ({ result } = await renderTonight());
      });

      test('then it lists the cached passes with no banners or spinners', () => {
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
    });
  });

  describe('given the phone is offline', () => {
    beforeEach(() => {
      setOnline(false);
    });

    describe('when the hook renders', () => {
      beforeEach(async () => {
        ({ result } = await renderTonight());
      });

      test('then it says the phone is offline', () => {
        expect(result.current.offline).toBe(true);
      });
    });
  });

  describe('given some of the orbit data is five days old', () => {
    beforeEach(() => {
      mockFetchedAt = [MOCK_NOW - 5 * DAY, MOCK_NOW - DAY];
    });

    describe('when the hook renders', () => {
      beforeEach(async () => {
        ({ result } = await renderTonight());
      });

      test('then it warns that the orbit data is five days old', () => {
        expect(result.current.staleDays).toBe(5);
      });
    });
  });

  describe('given the user has chosen a city', () => {
    beforeEach(() => {
      useSettingsStore.setState({ customLocation: CHOSEN });
    });

    describe('when the hook renders', () => {
      beforeEach(async () => {
        ({ result } = await renderTonight());
      });

      test('then it shows the chosen city', () => {
        expect(result.current.chosenLocation).toEqual(CHOSEN);
      });
    });
  });

  describe('given demo mode while offline with old orbit data and a chosen city', () => {
    beforeEach(() => {
      jest.mocked(useDemo).mockReturnValue(DEMO);
      setOnline(false);
      mockFetchedAt = [MOCK_NOW - 5 * DAY];
      useSettingsStore.setState({ customLocation: CHOSEN });
    });

    describe('when the hook renders', () => {
      beforeEach(async () => {
        ({ result } = await renderTonight());
      });

      test('then it hides the offline, stale and chosen-city banners for the demo evening', () => {
        expect(result.current).toMatchObject({
          offline: false,
          staleDays: null,
          chosenLocation: null,
          demoStartsAt: DEMO.startsAt,
        });
      });
    });
  });

  describe('given Tonight has loaded and recomputing the passes takes a while', () => {
    beforeEach(async () => {
      mockRefresh.mockReturnValue(new Promise(() => {}));
      ({ result } = await renderTonight());
    });

    describe('when the user pulls to refresh', () => {
      beforeEach(async () => {
        await act(async () => result.current.onRefresh());
      });

      test('then it shows the pull-to-refresh spinner', () => {
        expect(result.current.refreshing).toBe(true);
      });
    });
  });

  describe('given the user pulled to refresh and the passes are being recomputed', () => {
    let finish!: () => void;

    beforeEach(async () => {
      mockRefresh.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      ({ result } = await renderTonight());
      await act(async () => result.current.onRefresh());
    });

    describe('when the passes are recomputed', () => {
      beforeEach(async () => {
        await act(async () => finish());
      });

      test('then it stops the spinner', () => {
        expect(result.current.refreshing).toBe(false);
      });
    });
  });

  describe('given Tonight has loaded and recomputing the passes fails', () => {
    beforeEach(async () => {
      mockRefresh.mockRejectedValue(new Error('no location'));
      ({ result } = await renderTonight());
    });

    describe('when the user pulls to refresh', () => {
      beforeEach(async () => {
        await act(async () => result.current.onRefresh());
      });

      test('then it stops the spinner', () => {
        expect(result.current.refreshing).toBe(false);
      });
    });
  });

  describe('given Tonight has loaded', () => {
    beforeEach(async () => {
      ({ result } = await renderTonight());
    });

    describe('when the user catches the pass', () => {
      beforeEach(() => {
        result.current.onCatch(mockPass);
      });

      test('then it opens catch mode for the pass', () => {
        expect(jest.mocked(router.push).mock.calls).toEqual([['/catch/7']]);
      });
    });

    describe('when the user opens the satellite', () => {
      beforeEach(() => {
        result.current.onOpenSatellite(mockPass);
      });

      test('then it opens the satellite card', () => {
        expect(jest.mocked(router.push).mock.calls).toEqual([['/satellite/25544']]);
      });
    });

    describe('when the user chooses a city', () => {
      beforeEach(() => {
        result.current.onChooseCity();
      });

      test('then it opens the city picker', () => {
        expect(jest.mocked(router.push).mock.calls).toEqual([['/location']]);
      });
    });
  });

  describe('given Tonight has loaded and the user will deny location', () => {
    beforeEach(async () => {
      mockRequestPermission.mockRejectedValue(new Error('denied'));
      ({ result } = await renderTonight());
    });

    describe('when the user allows location', () => {
      beforeEach(() => {
        result.current.onAllowLocation();
      });

      test('then it asks for location permission', () => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });
    });
  });
});
