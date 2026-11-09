import { act, renderHook } from '@testing-library/react-native';
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
let mockMotionAvailable = true;
let mockCompassStarts = true;

jest.mock('expo-sensors', () => ({
  DeviceMotion: {
    isAvailableAsync: jest.fn(async () => mockMotionAvailable),
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
  watchHeadingAsync: jest.fn(async (listener: (reading: HeadingReading) => void) => {
    if (!mockCompassStarts) {
      throw new Error('denied');
    }
    listeners.heading = listener;
    return { remove: () => removed.push('heading') };
  }),
}));

const INITIAL = { azimuth: 90, elevation: 20 };
const SENSOR_TIMEOUT_MS = 2_500;
const DEG = Math.PI / 180;
const G = 9.81;
const ANDROID_POSE = readings(120, 35);

function gravityAt(elevation: number): Vector {
  return { x: 0, y: -G * Math.cos(elevation * DEG), z: G * Math.sin(elevation * DEG) };
}

function angleBetween(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

async function emit(update: () => void) {
  await act(async () => update());
}

async function emitHeading(reading: HeadingReading) {
  await emit(() => listeners.heading!(reading));
}

async function emitAndroidPose() {
  await emit(() => {
    listeners.motion!({ accelerationIncludingGravity: ANDROID_POSE.gravity });
    listeners.magnetometer!(ANDROID_POSE.magnetic);
  });
}

async function waitForSensorTimeout() {
  await act(async () => jest.advanceTimersByTime(SENSOR_TIMEOUT_MS));
}

async function renderPointing() {
  const hook = await renderHook(() => usePointing(INITIAL));
  await act(async () => {});
  return hook;
}

type Hook = Awaited<ReturnType<typeof renderPointing>>;

function onPhone(os: 'ios' | 'android', { motion = true, compass = true } = {}) {
  jest.useFakeTimers();
  Platform.OS = os;
  mockMotionAvailable = motion;
  mockCompassStarts = compass;
}

const originalPlatform = Platform.OS;

beforeEach(() => {
  removed.length = 0;
  delete listeners.motion;
  delete listeners.magnetometer;
  delete listeners.heading;
  useCalibrationStore.setState(useCalibrationStore.getInitialState());
});

afterEach(() => {
  Platform.OS = originalPlatform;
  jest.useRealTimers();
});

describe('usePointing', () => {
  let result: Hook['result'];
  let unmount: Hook['unmount'];

  describe('given an iPhone with motion sensors and a compass', () => {
    beforeEach(() => {
      onPhone('ios');
    });

    describe('when it starts', () => {
      beforeEach(async () => {
        ({ result } = await renderPointing());
      });

      test('then it aims with the sensors', () => {
        expect(result.current.mode).toBe('sensors');
      });

      test('then it starts where it was told', () => {
        expect(result.current.latest.current).toEqual(INITIAL);
      });
    });
  });

  describe('given an iPhone aiming with its sensors', () => {
    beforeEach(async () => {
      onPhone('ios');
      ({ result, unmount } = await renderPointing());
    });

    describe('when a heading arrives with no true heading', () => {
      beforeEach(async () => {
        await emitHeading({ trueHeading: -1, magHeading: 150, accuracy: 5 });
      });

      test('then it falls back to the magnetic heading', () => {
        expect(result.current.latest.current.azimuth).toBe(150);
      });
    });

    describe('when an unsure compass heading arrives', () => {
      beforeEach(async () => {
        await emitHeading({ trueHeading: 100, magHeading: 100, accuracy: 40 });
      });

      test('then it asks for a figure of eight', () => {
        expect(result.current.calibrate).toBe(true);
      });
    });

    describe('when no heading arrives in time', () => {
      beforeEach(async () => {
        await waitForSensorTimeout();
      });

      test('then it switches to drag-to-aim', () => {
        expect(result.current.mode).toBe('manual');
      });

      test('then it stops listening to the compass and motion sensors', () => {
        expect(removed).toEqual(expect.arrayContaining(['heading', 'motion']));
      });
    });

    describe('when the user drags the aim', () => {
      beforeEach(() => {
        result.current.setManual({ azimuth: 10, elevation: 60 });
      });

      test('then the drag sets the aim', () => {
        expect(result.current.latest.current).toEqual({ azimuth: 10, elevation: 60 });
      });
    });

    describe('when the screen closes', () => {
      beforeEach(async () => {
        await act(async () => unmount());
      });

      test('then it stops listening to the compass and motion sensors', () => {
        expect(removed.sort()).toEqual(['heading', 'motion']);
      });
    });
  });

  describe('given an iPhone with a compass heading of 200°', () => {
    beforeEach(async () => {
      onPhone('ios');
      ({ result } = await renderPointing());
      await emitHeading({ trueHeading: 200, magHeading: 198, accuracy: 5 });
    });

    describe('when gravity settles with the camera 30° up', () => {
      beforeEach(async () => {
        for (let i = 0; i < 40; i += 1) {
          await emit(() => listeners.motion!({ accelerationIncludingGravity: gravityAt(30) }));
        }
      });

      test('then it takes the heading from the compass', () => {
        expect(result.current.latest.current.azimuth).toBe(200);
        expect(result.current.azimuth.get()).toBe(200);
      });

      test('then it takes the elevation from gravity', () => {
        expect(result.current.latest.current.elevation).toBeCloseTo(30, 5);
      });
    });
  });

  describe('given an iPhone with a compass heading of 100°', () => {
    beforeEach(async () => {
      onPhone('ios');
      ({ result } = await renderPointing());
      await emitHeading({ trueHeading: 100, magHeading: 100, accuracy: 5 });
    });

    describe('when the Moon calibration is set', () => {
      beforeEach(async () => {
        await emit(() =>
          useCalibrationStore.getState().calibrate({ azimuth: 8, elevation: -2 }, 0),
        );
      });

      test('then it applies the calibration to the aim', () => {
        expect(result.current.latest.current).toEqual({ azimuth: 108, elevation: 18 });
      });

      test('then it keeps the raw reading', () => {
        expect(result.current.raw.current).toEqual({ azimuth: 100, elevation: 20 });
      });
    });

    describe('when the sensor timeout passes', () => {
      beforeEach(async () => {
        await waitForSensorTimeout();
      });

      test('then it stays on the sensors', () => {
        expect(result.current.mode).toBe('sensors');
      });
    });
  });

  describe('given an iPhone that has asked for a figure of eight', () => {
    beforeEach(async () => {
      onPhone('ios');
      ({ result } = await renderPointing());
      await emitHeading({ trueHeading: 100, magHeading: 100, accuracy: 40 });
    });

    describe('when a confident compass heading arrives', () => {
      beforeEach(async () => {
        await emitHeading({ trueHeading: 100, magHeading: 100, accuracy: 5 });
      });

      test('then it stops asking for a figure of eight', () => {
        expect(result.current.calibrate).toBe(false);
      });
    });
  });

  describe('given an iPhone without motion sensors', () => {
    beforeEach(() => {
      onPhone('ios', { motion: false });
    });

    describe('when it starts', () => {
      beforeEach(async () => {
        ({ result } = await renderPointing());
      });

      test('then it switches to drag-to-aim', () => {
        expect(result.current.mode).toBe('manual');
      });
    });
  });

  describe('given an iPhone whose compass can’t start', () => {
    beforeEach(() => {
      onPhone('ios', { compass: false });
    });

    describe('when it starts', () => {
      beforeEach(async () => {
        ({ result } = await renderPointing());
      });

      test('then it switches to drag-to-aim', () => {
        expect(result.current.mode).toBe('manual');
      });
    });
  });

  describe('given an Android phone whose compass reports a declination of 2°', () => {
    beforeEach(async () => {
      onPhone('android');
      ({ result } = await renderPointing());
      await emitHeading({ trueHeading: 52, magHeading: 50, accuracy: 3 });
    });

    describe('when gravity and the magnetometer settle on the camera pointing at 120°, 35° up', () => {
      beforeEach(async () => {
        for (let i = 0; i < 40; i += 1) {
          await emitAndroidPose();
        }
      });

      test('then it works the heading out from gravity and the magnetometer, plus declination', () => {
        expect(angleBetween(result.current.latest.current.azimuth, 122)).toBeLessThan(0.01);
      });

      test('then it takes the elevation from gravity', () => {
        expect(result.current.latest.current.elevation).toBeCloseTo(35, 2);
      });
    });
  });

  describe('given an Android phone aiming with its sensors', () => {
    beforeEach(async () => {
      onPhone('android');
      ({ result, unmount } = await renderPointing());
    });

    describe('when a compass heading arrives', () => {
      beforeEach(async () => {
        await emitHeading({ trueHeading: 300, magHeading: 300, accuracy: 3 });
      });

      test('then it ignores the compass heading itself', () => {
        expect(result.current.latest.current.azimuth).toBe(INITIAL.azimuth);
      });
    });

    describe('when the screen closes', () => {
      beforeEach(async () => {
        await act(async () => unmount());
      });

      test('then it stops all three listeners', () => {
        expect(removed.sort()).toEqual(['heading', 'magnetometer', 'motion']);
      });
    });
  });

  describe('given an Android phone whose compass can’t start, with gravity and magnetometer readings', () => {
    beforeEach(async () => {
      onPhone('android', { compass: false });
      ({ result } = await renderPointing());
      await emitAndroidPose();
    });

    describe('when the sensor timeout passes', () => {
      beforeEach(async () => {
        await waitForSensorTimeout();
      });

      test('then it keeps the sensors', () => {
        expect(result.current.mode).toBe('sensors');
      });
    });
  });
});
