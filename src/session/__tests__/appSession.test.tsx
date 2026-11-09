import { act, renderHook } from '@testing-library/react-native';

import { deviceData, freshDemoData } from '@/data/client';
import { DEMO_LEAD, DEMO_OBSERVER, findDemoPass } from '@/demo/scenario';
import { DEMO_PASS } from '@/demo/testing/demoMocks';
import type { Clock } from '@/environment/clock';
import { useSettingsStore } from '@/stores/settingsStore';
import { refreshOrbits, type RefreshOutcome } from '@/sync/celestrak';

import {
  useAppSession,
  useDemo,
  useOrbitRefreshStatus,
  useSessionFeatures,
  type AppSession,
} from '../appSession';
import { DEMO_FEATURES, DEVICE_FEATURES } from '../features';

jest.mock('@/data/client', () => {
  let demoRuns = 0;
  const passCacheRunner = { refresh: jest.fn(async () => {}) };
  return {
    deviceData: jest.fn(() => ({ key: 'device', passCacheRunner })),
    freshDemoData: jest.fn(() => ({ key: `demo-${++demoRuns}`, passCacheRunner })),
  };
});

jest.mock('@/sync/celestrak', () => ({
  ...jest.requireActual('@/sync/celestrak'),
  refreshOrbits: jest.fn(),
}));

jest.mock('@/data/snapshot', () => ({ bundledSnapshot: {} }));

jest.mock('@/demo/scenario', () => ({
  ...jest.requireActual('@/demo/scenario'),
  findDemoPass: jest.fn(),
}));

const WALL_CLOCK = Date.UTC(2026, 10, 9, 12, 0);

async function setDemoMode(enabled: boolean) {
  await act(async () => useSettingsStore.getState().setDemoMode(enabled));
}

async function openSession() {
  const { result } = await renderHook(() => useAppSession());
  return result;
}

beforeEach(async () => {
  jest.useFakeTimers({ now: WALL_CLOCK });
  await setDemoMode(false);
  jest.clearAllMocks();
  jest.mocked(findDemoPass).mockReturnValue(DEMO_PASS);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useAppSession', () => {
  describe('given the snapshot has no demo pass and the session is open', () => {
    let session: { current: AppSession };

    beforeEach(async () => {
      jest.mocked(findDemoPass).mockReturnValue(null);
      session = await openSession();
    });

    describe('when demo mode turns on', () => {
      beforeEach(async () => {
        await setDemoMode(true);
      });

      test('then it stays on the device database', () => {
        expect(session.current).toMatchObject({
          data: { key: 'device' },
          demo: null,
          features: DEVICE_FEATURES,
        });
      });

      test('then it makes no demo database', () => {
        expect(freshDemoData).not.toHaveBeenCalled();
      });
    });
  });

  describe('given demo mode is off', () => {
    describe('when the session opens', () => {
      let session: { current: AppSession };

      beforeEach(async () => {
        session = await openSession();
      });

      test('then it uses the device database', () => {
        expect(session.current.data.key).toBe('device');
      });

      test('then there is no demo', () => {
        expect(session.current.demo).toBeNull();
      });
    });
  });

  describe('given the session is open outside demo mode', () => {
    let session: { current: AppSession };
    let before: AppSession;

    beforeEach(async () => {
      session = await openSession();
      before = session.current;
    });

    describe('when demo mode turns on', () => {
      beforeEach(async () => {
        await setDemoMode(true);
      });

      test('then it switches to a fresh demo database', () => {
        expect(session.current.data.key).toMatch(/^demo-/);
      });

      test('then it puts the user in London a minute before the demo pass', () => {
        expect(session.current.demo).toMatchObject({
          observer: DEMO_OBSERVER,
          pass: DEMO_PASS,
          startsAt: DEMO_PASS.startAt - DEMO_LEAD,
        });
      });

      test('then it turns off orbit updates, reminders, the camera, onboarding and the chosen city', () => {
        expect(session.current.features).toEqual(DEMO_FEATURES);
      });
    });

    describe('when the user changes another setting', () => {
      beforeEach(async () => {
        await act(async () => useSettingsStore.getState().setHapticsEnabled(false));
      });

      test('then it keeps the same session', () => {
        expect(session.current).toBe(before);
      });
    });
  });

  describe('given the session is open in demo mode', () => {
    let session: { current: AppSession };

    beforeEach(async () => {
      session = await openSession();
      await setDemoMode(true);
    });

    describe('when demo mode turns off', () => {
      beforeEach(async () => {
        await setDemoMode(false);
      });

      test('then it goes back to the device database', () => {
        expect(session.current).toMatchObject({
          data: { key: 'device' },
          demo: null,
          features: DEVICE_FEATURES,
        });
      });

      test('then it reopens the device database', () => {
        expect(deviceData).toHaveBeenCalled();
      });
    });
  });

  describe('given a demo has run and been turned off', () => {
    let session: { current: AppSession };
    let first: string;

    beforeEach(async () => {
      session = await openSession();
      await setDemoMode(true);
      first = session.current.data.key;
      await setDemoMode(false);
    });

    describe('when demo mode turns on again', () => {
      beforeEach(async () => {
        await setDemoMode(true);
      });

      test('then it starts from a different database', () => {
        expect(session.current.data.key).not.toBe(first);
      });

      test('then it has made a fresh database for each demo', () => {
        expect(freshDemoData).toHaveBeenCalledTimes(2);
      });
    });
  });
});

describe('useDemo', () => {
  describe('given demo mode is off and the demo is being watched', () => {
    let demo: { current: ReturnType<typeof useDemo> };

    beforeEach(async () => {
      ({ result: demo } = await renderHook(() => useDemo()));
    });

    describe('when demo mode turns on', () => {
      beforeEach(async () => {
        await setDemoMode(true);
      });

      test('then the demo clock starts a minute before the demo pass', () => {
        expect(demo.current!.clock.now()).toBe(DEMO_PASS.startAt - DEMO_LEAD);
      });
    });
  });

  describe('given the demo has just started', () => {
    let clock: Clock;

    beforeEach(async () => {
      const { result } = await renderHook(() => useDemo());
      await setDemoMode(true);
      clock = result.current!.clock;
    });

    describe('when 90 seconds pass', () => {
      beforeEach(() => {
        jest.advanceTimersByTime(90_000);
      });

      test('then the demo clock runs in real time', () => {
        expect(clock.now()).toBe(DEMO_PASS.startAt - DEMO_LEAD + 90_000);
      });
    });
  });
});

describe('useSessionFeatures', () => {
  describe('given demo mode is off and the features are being watched', () => {
    let features: { current: ReturnType<typeof useSessionFeatures> };

    beforeEach(async () => {
      ({ result: features } = await renderHook(() => useSessionFeatures()));
    });

    test('then every feature is on', () => {
      expect(features.current).toEqual(DEVICE_FEATURES);
    });

    describe('when demo mode turns on', () => {
      beforeEach(async () => {
        await setDemoMode(true);
      });

      test('then the demo features apply', () => {
        expect(features.current).toEqual(DEMO_FEATURES);
      });
    });
  });
});

describe('useOrbitRefreshStatus', () => {
  describe('given demo mode is off and the orbit check status is being watched', () => {
    let status: { current: ReturnType<typeof useOrbitRefreshStatus> };
    let session: { current: AppSession };

    beforeEach(async () => {
      jest.mocked(refreshOrbits).mockReturnValue(new Promise(() => {}));
      ({ result: session } = await renderHook(() => useAppSession()));
      ({ result: status } = await renderHook(() => useOrbitRefreshStatus()));
    });

    test('then no check is running', () => {
      expect(status.current).toBe('idle');
    });

    describe('when the session checks for new orbits', () => {
      beforeEach(async () => {
        await act(async () => {
          session.current.orbitRefresher.refresh();
        });
      });

      test('then it shows that a check is running', () => {
        expect(status.current).toBe('checking');
      });
    });
  });
});

describe('the session’s orbit refresher', () => {
  describe('given the demo has started', () => {
    let session: { current: AppSession };

    beforeEach(async () => {
      session = await openSession();
      await setDemoMode(true);
    });

    describe('when new orbits arrive', () => {
      beforeEach(async () => {
        const outcomes: Record<string, RefreshOutcome> = { visual: 'updated' };
        jest.mocked(refreshOrbits).mockResolvedValue(outcomes);
        await act(() => session.current.orbitRefresher.refresh());
      });

      test('then it recomputes the passes at the demo time', () => {
        expect(session.current.data.passCacheRunner.refresh).toHaveBeenCalledWith(
          DEMO_PASS.startAt - DEMO_LEAD,
        );
      });
    });
  });
});
