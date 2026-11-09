import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';
import { Platform } from 'react-native';

import { useCalibrationStore } from '@/stores/calibrationStore';

import type { Vector } from '../pointing';
import { readings } from '../testing/pose';
import { usePointing } from '../usePointing';

type HeadingReading = { trueHeading: number; magHeading: number; accuracy: number };

const listeners: {
  motion?: (measurement: { accelerationIncludingGravity: Vector }) => void;
  magnetometer?: (reading: Vector) => void;
  heading?: (reading: HeadingReading) => void;
} = {};
const removed: string[] = [];

jest.mock('expo-sensors', () => ({
  DeviceMotion: {
    isAvailableAsync: jest.fn(),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn((listener) => {
      listeners.motion = listener;
      return { remove: () => removed.push('motion') };
    }),
  },
  Magnetometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn((listener) => {
      listeners.magnetometer = listener;
      return { remove: () => removed.push('magnetometer') };
    }),
  },
}));

jest.mock('react-native-reanimated', () => jest.requireActual('@/testing/reanimated'));

jest.mock('expo-location', () => ({
  watchHeadingAsync: jest.fn(),
}));

const INITIAL = { azimuth: 90, elevation: 20 };
const SENSOR_TIMEOUT_MS = 2_500;
const DEG = Math.PI / 180;
const G = 9.81;

function gravityAt(elevation: number): Vector {
  return { x: 0, y: -G * Math.cos(elevation * DEG), z: G * Math.sin(elevation * DEG) };
}

function angleBetween(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

async function emit(update: () => void) {
  await act(async () => update());
}

async function renderPointing() {
  const hook = await renderHook(() => usePointing(INITIAL));
  await act(async () => {});
  return hook;
}

const originalPlatform = Platform.OS;

beforeEach(() => {
  jest.useFakeTimers();
  removed.length = 0;
  delete listeners.motion;
  delete listeners.magnetometer;
  delete listeners.heading;
  useCalibrationStore.setState(useCalibrationStore.getInitialState());
  jest.mocked(DeviceMotion.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Location.watchHeadingAsync).mockImplementation(async (listener) => {
    listeners.heading = listener as (reading: HeadingReading) => void;
    return { remove: () => removed.push('heading') };
  });
});

afterEach(() => {
  Platform.OS = originalPlatform;
  jest.useRealTimers();
});

describe('usePointing on iOS', () => {
  test('starts where it was told and aims with the sensors', async () => {
    const { result } = await renderPointing();

    expect(result.current.mode).toBe('sensors');
    expect(result.current.latest.current).toEqual(INITIAL);
  });

  test('takes the heading from the compass and the elevation from gravity', async () => {
    const { result } = await renderPointing();

    await emit(() => listeners.heading!({ trueHeading: 200, magHeading: 198, accuracy: 5 }));
    for (let i = 0; i < 40; i += 1) {
      await emit(() => listeners.motion!({ accelerationIncludingGravity: gravityAt(30) }));
    }

    expect(result.current.latest.current.azimuth).toBe(200);
    expect(result.current.latest.current.elevation).toBeCloseTo(30, 5);
    expect(result.current.azimuth.get()).toBe(200);
  });

  test('falls back to the magnetic heading without a true one', async () => {
    const { result } = await renderPointing();

    await emit(() => listeners.heading!({ trueHeading: -1, magHeading: 150, accuracy: 5 }));

    expect(result.current.latest.current.azimuth).toBe(150);
  });

  test('applies the Moon calibration but keeps the raw reading', async () => {
    const { result } = await renderPointing();
    await emit(() => listeners.heading!({ trueHeading: 100, magHeading: 100, accuracy: 5 }));

    await emit(() => useCalibrationStore.getState().calibrate({ azimuth: 8, elevation: -2 }, 0));

    expect(result.current.latest.current).toEqual({ azimuth: 108, elevation: 18 });
    expect(result.current.raw.current).toEqual({ azimuth: 100, elevation: 20 });
  });

  test('asks for a figure of eight when the compass is unsure', async () => {
    const { result } = await renderPointing();

    await emit(() => listeners.heading!({ trueHeading: 100, magHeading: 100, accuracy: 40 }));
    expect(result.current.calibrate).toBe(true);

    await emit(() => listeners.heading!({ trueHeading: 100, magHeading: 100, accuracy: 5 }));
    expect(result.current.calibrate).toBe(false);
  });

  test('switches to drag-to-aim when no heading arrives', async () => {
    const { result } = await renderPointing();

    await act(async () => jest.advanceTimersByTime(SENSOR_TIMEOUT_MS));

    expect(result.current.mode).toBe('manual');
    expect(removed).toEqual(expect.arrayContaining(['heading', 'motion']));
  });

  test('stays on the sensors once a heading has arrived', async () => {
    const { result } = await renderPointing();
    await emit(() => listeners.heading!({ trueHeading: 100, magHeading: 100, accuracy: 5 }));

    await act(async () => jest.advanceTimersByTime(SENSOR_TIMEOUT_MS));

    expect(result.current.mode).toBe('sensors');
  });

  test('switches to drag-to-aim without motion sensors', async () => {
    jest.mocked(DeviceMotion.isAvailableAsync).mockResolvedValue(false);
    const { result } = await renderPointing();

    expect(result.current.mode).toBe('manual');
  });

  test('switches to drag-to-aim when the compass cannot start', async () => {
    jest.mocked(Location.watchHeadingAsync).mockRejectedValue(new Error('denied'));
    const { result } = await renderPointing();

    expect(result.current.mode).toBe('manual');
  });

  test('lets a drag set the aim', async () => {
    const { result } = await renderPointing();

    result.current.setManual({ azimuth: 10, elevation: 60 });

    expect(result.current.latest.current).toEqual({ azimuth: 10, elevation: 60 });
  });

  test('stops listening when the screen closes', async () => {
    const { unmount } = await renderPointing();

    await act(async () => unmount());

    expect(removed.sort()).toEqual(['heading', 'motion']);
  });
});

describe('usePointing on Android', () => {
  beforeEach(() => {
    Platform.OS = 'android';
  });

  test('works the heading out from gravity and the magnetometer, plus declination', async () => {
    const { result } = await renderPointing();
    const pose = readings(120, 35);

    await emit(() => listeners.heading!({ trueHeading: 52, magHeading: 50, accuracy: 3 }));
    for (let i = 0; i < 40; i += 1) {
      await emit(() => {
        listeners.motion!({ accelerationIncludingGravity: pose.gravity });
        listeners.magnetometer!(pose.magnetic);
      });
    }

    expect(angleBetween(result.current.latest.current.azimuth, 122)).toBeLessThan(0.01);
    expect(result.current.latest.current.elevation).toBeCloseTo(35, 2);
  });

  test('ignores the compass heading itself', async () => {
    const { result } = await renderPointing();

    await emit(() => listeners.heading!({ trueHeading: 300, magHeading: 300, accuracy: 3 }));

    expect(result.current.latest.current.azimuth).toBe(INITIAL.azimuth);
  });

  test('keeps the sensors when the compass cannot start', async () => {
    jest.mocked(Location.watchHeadingAsync).mockRejectedValue(new Error('denied'));
    const { result } = await renderPointing();
    const pose = readings(120, 35);

    await emit(() => {
      listeners.motion!({ accelerationIncludingGravity: pose.gravity });
      listeners.magnetometer!(pose.magnetic);
    });
    await act(async () => jest.advanceTimersByTime(SENSOR_TIMEOUT_MS));

    expect(result.current.mode).toBe('sensors');
  });

  test('stops all three listeners when the screen closes', async () => {
    const { unmount } = await renderPointing();

    await act(async () => unmount());

    expect(removed.sort()).toEqual(['heading', 'magnetometer', 'motion']);
  });
});
