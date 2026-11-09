import { act, render, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ClockProvider } from '@/environment/clock';
import type { LocationState } from '@/environment/location';
import { useSettingsStore } from '@/stores/settingsStore';

import { PassCacheProvider, usePassCache } from '../PassCacheScheduler';
import type { PassCacheRunner, PassCacheState } from '../runner';

const MINUTE = 60_000;
const LONDON = { latitude: 51.5, longitude: -0.13, altitude: 0 };
const MADRID = { latitude: 40.4, longitude: -3.7, altitude: 0.6 };
let mockLocation: LocationState = { status: 'locating' };
let now = Date.UTC(2026, 10, 8, 20, 0);

jest.mock('@/environment/location', () => ({
  useLocation: () => ({ state: mockLocation }),
}));

function fakeRunner() {
  let state: PassCacheState = {
    status: 'idle',
    computedAt: null,
    settledAt: null,
    replacing: false,
  };
  const listeners = new Set<() => void>();
  return {
    request: jest.fn<Promise<void>, Parameters<PassCacheRunner['request']>>(async () => {}),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
    publish(next: PassCacheState) {
      state = next;
      listeners.forEach((listener) => listener());
    },
  };
}

let runner: ReturnType<typeof fakeRunner>;

function Providers({ children }: { children: ReactNode }) {
  return (
    <ClockProvider clock={{ now: () => now }}>
      <PassCacheProvider runner={runner as unknown as PassCacheRunner}>
        {children}
      </PassCacheProvider>
    </ClockProvider>
  );
}

async function renderScheduler() {
  return render(<Providers>{null}</Providers>);
}

beforeEach(() => {
  jest.useFakeTimers();
  now = Date.UTC(2026, 10, 8, 20, 0);
  mockLocation = { status: 'locating' };
  runner = fakeRunner();
  useSettingsStore.setState({ minElevation: 10 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('PassCacheProvider', () => {
  test('waits for a location before computing passes', async () => {
    await renderScheduler();

    expect(runner.request).not.toHaveBeenCalled();
  });

  test('computes passes for the observer and minimum elevation', async () => {
    mockLocation = { status: 'ready', observer: LONDON };

    await renderScheduler();

    expect(runner.request).toHaveBeenCalledWith({ observer: LONDON, minElevation: 10, now });
  });

  test('recomputes when the location or minimum elevation changes', async () => {
    mockLocation = { status: 'ready', observer: LONDON };
    const { rerender } = await renderScheduler();

    mockLocation = { status: 'ready', observer: MADRID };
    await rerender(<Providers>{null}</Providers>);
    await act(async () => useSettingsStore.setState({ minElevation: 20 }));

    expect(runner.request.mock.calls.map(([input]) => input)).toEqual([
      expect.objectContaining({ observer: LONDON, minElevation: 10 }),
      expect.objectContaining({ observer: MADRID, minElevation: 10 }),
      expect.objectContaining({ observer: MADRID, minElevation: 20 }),
    ]);
  });

  test('checks again every ten minutes', async () => {
    mockLocation = { status: 'ready', observer: LONDON };
    await renderScheduler();

    now += 10 * MINUTE;
    await act(async () => jest.advanceTimersByTime(10 * MINUTE));

    expect(runner.request).toHaveBeenCalledTimes(2);
    expect(runner.request).toHaveBeenLastCalledWith(expect.objectContaining({ now }));
  });
});

describe('usePassCache', () => {
  test('follows the runner state', async () => {
    const { result } = await renderHook(() => usePassCache(), { wrapper: Providers });

    await act(async () =>
      runner.publish({ status: 'computing', computedAt: null, settledAt: null, replacing: true }),
    );

    expect(result.current.state).toMatchObject({ status: 'computing', replacing: true });
  });

  test('forces a recompute on refresh', async () => {
    mockLocation = { status: 'ready', observer: LONDON };
    const { result } = await renderHook(() => usePassCache(), { wrapper: Providers });

    await act(() => result.current.refresh());

    expect(runner.request).toHaveBeenLastCalledWith(
      { observer: LONDON, minElevation: 10, now },
      true,
    );
  });

  test('has nothing to refresh without a location', async () => {
    const { result } = await renderHook(() => usePassCache(), { wrapper: Providers });

    await act(() => result.current.refresh());

    expect(runner.request).not.toHaveBeenCalled();
  });

  test('must be used inside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => usePassCache())).rejects.toThrow(
      'usePassCache must be used inside a PassCacheProvider',
    );
  });
});
