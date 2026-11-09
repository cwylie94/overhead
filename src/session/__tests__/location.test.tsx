import { act, renderHook } from '@testing-library/react-native';

import { useSettingsStore } from '@/stores/settingsStore';

import { useAppSession, type AppSession, type DemoEnvironment } from '../appSession';
import { DEMO_FEATURES, DEVICE_FEATURES } from '../features';
import { fixedObserver, useChosenLocation, useFixedObserver } from '../location';

jest.mock('../appSession', () => ({ useAppSession: jest.fn() }));

const MADRID = { name: 'Madrid', country: 'Spain', latitude: 40.4, longitude: -3.7 };
const LONDON = { latitude: 51.5, longitude: -0.13, altitude: 0.02 };
const DEMO = { observer: LONDON } as DemoEnvironment;

function onDevice() {
  jest
    .mocked(useAppSession)
    .mockReturnValue({ demo: null, features: DEVICE_FEATURES } as unknown as AppSession);
}

function inDemo() {
  jest
    .mocked(useAppSession)
    .mockReturnValue({ demo: DEMO, features: DEMO_FEATURES } as unknown as AppSession);
}

beforeEach(() => {
  useSettingsStore.setState({ customLocation: null });
  onDevice();
});

describe('fixedObserver', () => {
  test('the demo observes from its own place, even with a chosen city', () => {
    expect(fixedObserver(DEMO, MADRID)).toBe(LONDON);
  });

  test('a chosen city is observed from at sea level', () => {
    expect(fixedObserver(null, MADRID)).toEqual({ latitude: 40.4, longitude: -3.7, altitude: 0 });
  });

  test('with neither, the device decides', () => {
    expect(fixedObserver(null, null)).toBeNull();
  });
});

describe('useChosenLocation', () => {
  describe('given the user chose Madrid', () => {
    beforeEach(() => {
      useSettingsStore.setState({ customLocation: MADRID });
    });

    test('then the device session observes from Madrid', async () => {
      const { result } = await renderHook(() => useChosenLocation());
      expect(result.current).toEqual(MADRID);
    });

    test('then the demo ignores it', async () => {
      inDemo();
      const { result } = await renderHook(() => useChosenLocation());
      expect(result.current).toBeNull();
    });
  });
});

describe('useFixedObserver', () => {
  describe('given the device session with no chosen city', () => {
    let observer: { current: ReturnType<typeof useFixedObserver> };

    beforeEach(async () => {
      ({ result: observer } = await renderHook(() => useFixedObserver()));
    });

    test('then the device decides where the user is', () => {
      expect(observer.current).toBeNull();
    });

    describe('when the user chooses Madrid', () => {
      beforeEach(async () => {
        await act(async () => useSettingsStore.setState({ customLocation: MADRID }));
      });

      test('then it observes from Madrid', () => {
        expect(observer.current).toEqual({ latitude: 40.4, longitude: -3.7, altitude: 0 });
      });
    });
  });

  describe('given the device session observing from Madrid', () => {
    let observer: { current: ReturnType<typeof useFixedObserver> };
    let rerender: () => Promise<void>;
    let before: ReturnType<typeof useFixedObserver>;

    beforeEach(async () => {
      useSettingsStore.setState({ customLocation: MADRID });
      const hook = await renderHook(() => useFixedObserver());
      observer = hook.result;
      rerender = () => hook.rerender({});
      before = observer.current;
    });

    describe('when another setting changes', () => {
      beforeEach(async () => {
        await act(async () => useSettingsStore.setState({ hapticsEnabled: false }));
        await rerender();
      });

      test('then it keeps the same observer, so nothing downstream reloads', () => {
        expect(observer.current).toBe(before);
      });
    });
  });

  describe('given the demo', () => {
    beforeEach(() => {
      inDemo();
    });

    test('then it observes from the demo’s place', async () => {
      const { result } = await renderHook(() => useFixedObserver());
      expect(result.current).toBe(LONDON);
    });
  });
});
