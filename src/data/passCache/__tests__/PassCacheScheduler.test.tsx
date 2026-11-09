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

function renderPassCacheHook() {
  return renderHook(() => usePassCache(), { wrapper: Providers });
}

type PassCacheHook = Awaited<ReturnType<typeof renderPassCacheHook>>;

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
  describe('given the location is still being found', () => {
    beforeEach(() => {
      mockLocation = { status: 'locating' };
    });

    describe('when the app starts', () => {
      beforeEach(async () => {
        await renderScheduler();
      });

      test('then it waits for a location before computing passes', () => {
        expect(runner.request).not.toHaveBeenCalled();
      });
    });
  });

  describe('given the user is in London with a minimum elevation of 10°', () => {
    beforeEach(() => {
      mockLocation = { status: 'ready', observer: LONDON };
      useSettingsStore.setState({ minElevation: 10 });
    });

    describe('when the app starts', () => {
      beforeEach(async () => {
        await renderScheduler();
      });

      test('then it computes passes for that place and minimum elevation, now', () => {
        expect(runner.request).toHaveBeenCalledWith({ observer: LONDON, minElevation: 10, now });
      });
    });
  });

  describe('given passes were computed for London at 10°', () => {
    let rerender: Awaited<ReturnType<typeof renderScheduler>>['rerender'];

    beforeEach(async () => {
      mockLocation = { status: 'ready', observer: LONDON };
      useSettingsStore.setState({ minElevation: 10 });
      ({ rerender } = await renderScheduler());
    });

    describe('when the user’s location changes to Madrid', () => {
      beforeEach(async () => {
        mockLocation = { status: 'ready', observer: MADRID };
        await rerender(<Providers>{null}</Providers>);
      });

      test('then it recomputes for Madrid', () => {
        expect(runner.request.mock.calls.map(([input]) => input)).toEqual([
          expect.objectContaining({ observer: LONDON, minElevation: 10 }),
          expect.objectContaining({ observer: MADRID, minElevation: 10 }),
        ]);
      });
    });

    describe('when ten minutes pass', () => {
      beforeEach(async () => {
        now += 10 * MINUTE;
        await act(async () => jest.advanceTimersByTime(10 * MINUTE));
      });

      test('then it checks again', () => {
        expect(runner.request).toHaveBeenCalledTimes(2);
      });

      test('then it checks for the new time', () => {
        expect(runner.request).toHaveBeenLastCalledWith(expect.objectContaining({ now }));
      });
    });
  });

  describe('given passes were computed for London at 10° and then for Madrid', () => {
    beforeEach(async () => {
      mockLocation = { status: 'ready', observer: LONDON };
      useSettingsStore.setState({ minElevation: 10 });
      const { rerender } = await renderScheduler();
      mockLocation = { status: 'ready', observer: MADRID };
      await rerender(<Providers>{null}</Providers>);
    });

    describe('when the user sets the minimum elevation to 20°', () => {
      beforeEach(async () => {
        await act(async () => useSettingsStore.setState({ minElevation: 20 }));
      });

      test('then it recomputes for the new minimum elevation', () => {
        expect(runner.request.mock.calls.map(([input]) => input)).toEqual([
          expect.objectContaining({ observer: LONDON, minElevation: 10 }),
          expect.objectContaining({ observer: MADRID, minElevation: 10 }),
          expect.objectContaining({ observer: MADRID, minElevation: 20 }),
        ]);
      });
    });
  });
});

describe('usePassCache', () => {
  describe('given the hook is in use while the location is still being found', () => {
    let hook: PassCacheHook;

    beforeEach(async () => {
      mockLocation = { status: 'locating' };
      hook = await renderPassCacheHook();
    });

    describe('when the runner starts computing', () => {
      beforeEach(async () => {
        await act(async () =>
          runner.publish({
            status: 'computing',
            computedAt: null,
            settledAt: null,
            replacing: true,
          }),
        );
      });

      test('then it follows the runner state', () => {
        expect(hook.result.current.state).toMatchObject({ status: 'computing', replacing: true });
      });
    });

    describe('when the user refreshes', () => {
      beforeEach(async () => {
        await act(() => hook.result.current.refresh());
      });

      test('then it has nothing to refresh', () => {
        expect(runner.request).not.toHaveBeenCalled();
      });
    });
  });

  describe('given the hook is in use in London with a minimum elevation of 10°', () => {
    let hook: PassCacheHook;

    beforeEach(async () => {
      mockLocation = { status: 'ready', observer: LONDON };
      useSettingsStore.setState({ minElevation: 10 });
      hook = await renderPassCacheHook();
    });

    describe('when the user refreshes', () => {
      beforeEach(async () => {
        await act(() => hook.result.current.refresh());
      });

      test('then it forces a recompute', () => {
        expect(runner.request).toHaveBeenLastCalledWith(
          { observer: LONDON, minElevation: 10, now },
          true,
        );
      });
    });
  });

  describe('given there is no PassCacheProvider', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    describe('when the hook is used', () => {
      let rendering: Promise<unknown>;

      beforeEach(() => {
        rendering = renderHook(() => usePassCache());
        rendering.catch(() => {});
      });

      test('then it says it must be used inside the provider', async () => {
        await expect(rendering).rejects.toThrow(
          'usePassCache must be used inside a PassCacheProvider',
        );
      });
    });
  });
});
