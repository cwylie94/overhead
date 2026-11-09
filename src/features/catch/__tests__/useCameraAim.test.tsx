import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import type { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { moonLookAngles } from '@/domain/moon';
import { toGeodetic } from '@/domain/observer';
import type { SkyPosition } from '@/domain/sky';
import { ClockProvider } from '@/environment/clock';
import { useCalibrationStore } from '@/stores/calibrationStore';

import { useCameraAim } from '../useCameraAim';
import type { Pointing, PointingMode } from '../usePointing';

let mockCameraDevice: ReturnType<typeof useCameraDevice>;
let mockCameraPermission: ReturnType<typeof useCameraPermission>;

jest.mock('react-native-vision-camera', () => ({
  useCameraDevice: () => mockCameraDevice,
  useCameraPermission: () => mockCameraPermission,
}));

const LONDON = { latitude: 51.5074, longitude: -0.1278, altitude: 0.011 };
const HOUR = 60 * 60_000;
const BACK_CAMERA = { id: 'back' } as ReturnType<typeof useCameraDevice>;

function timeWithMoon(up: boolean): number {
  const start = Date.UTC(2026, 10, 9, 0, 0);
  for (let time = start; time < start + 30 * 24 * HOUR; time += HOUR) {
    const { elevation } = moonLookAngles(toGeodetic(LONDON), time);
    if (up ? elevation > 30 : elevation < -10) {
      return time;
    }
  }
  throw new Error('No such time');
}

const MOON_UP = timeWithMoon(true);
const MOON_DOWN = timeWithMoon(false);
const moon = moonLookAngles(toGeodetic(LONDON), MOON_UP);

function makePointing(mode: PointingMode, raw: SkyPosition): Pointing {
  return { mode, raw: { current: raw } } as Pointing;
}

const requestPermission = jest.fn<Promise<boolean>, []>();

function grantCamera(hasPermission: boolean, canRequestPermission = true) {
  mockCameraPermission = {
    hasPermission,
    canRequestPermission,
    requestPermission,
  } as unknown as ReturnType<typeof useCameraPermission>;
}

function wrapper({ children }: { children: ReactNode }) {
  return <ClockProvider clock={{ now: () => MOON_UP }}>{children}</ClockProvider>;
}

type Options = { mode?: PointingMode; raw?: SkyPosition; now?: number; allowed?: boolean };

async function renderAim({
  mode = 'sensors',
  raw = { azimuth: moon.azimuth + 5, elevation: moon.elevation - 3 },
  now = MOON_UP,
  allowed = true,
}: Options = {}) {
  const pointing = makePointing(mode, raw);
  return renderHook(() => useCameraAim(pointing, LONDON, now, allowed), { wrapper });
}

type Aim = Awaited<ReturnType<typeof renderAim>>['result'];

beforeEach(() => {
  jest.clearAllMocks();
  useCalibrationStore.setState(useCalibrationStore.getInitialState());
  mockCameraDevice = BACK_CAMERA;
  grantCamera(true);
  requestPermission.mockResolvedValue(true);
});

describe('useCameraAim', () => {
  let result: Aim;

  async function toggleCamera() {
    await act(() => result.current.toggleCamera());
  }

  async function startCalibration() {
    await act(async () => result.current.startCalibration());
  }

  describe('given sensors and a back camera', () => {
    beforeEach(() => {
      mockCameraDevice = BACK_CAMERA;
    });

    describe('when it renders', () => {
      beforeEach(async () => {
        ({ result } = await renderAim({ mode: 'sensors', allowed: true }));
      });

      test('then the camera is available', () => {
        expect(result.current.available).toBe(true);
      });

      test('then the camera starts off', () => {
        expect(result.current.cameraOn).toBe(false);
      });
    });
  });

  describe.each([
    { situation: 'demo mode', options: { allowed: false } },
    { situation: 'drag-to-aim', options: { mode: 'manual' as const } },
  ])('given $situation', ({ options }) => {
    describe('when it renders', () => {
      beforeEach(async () => {
        ({ result } = await renderAim(options));
      });

      test('then no camera is available', () => {
        expect(result.current.available).toBe(false);
      });
    });
  });

  describe('given a phone without a back camera', () => {
    beforeEach(() => {
      mockCameraDevice = undefined;
    });

    describe('when it renders', () => {
      beforeEach(async () => {
        ({ result } = await renderAim());
      });

      test('then no camera is available', () => {
        expect(result.current.available).toBe(false);
      });
    });
  });

  describe('given camera access and the camera off', () => {
    beforeEach(async () => {
      grantCamera(true);
      ({ result } = await renderAim());
    });

    describe('when the user turns the camera on', () => {
      beforeEach(async () => {
        await toggleCamera();
      });

      test('then the camera is on', () => {
        expect(result.current.cameraOn).toBe(true);
      });

      test('then it doesn’t ask for camera access', () => {
        expect(requestPermission).not.toHaveBeenCalled();
      });
    });
  });

  describe('given camera access and the camera on', () => {
    beforeEach(async () => {
      grantCamera(true);
      ({ result } = await renderAim());
      await toggleCamera();
    });

    describe('when the user turns the camera off', () => {
      beforeEach(async () => {
        await toggleCamera();
      });

      test('then the camera is off', () => {
        expect(result.current.cameraOn).toBe(false);
      });
    });
  });

  describe('given camera access hasn’t been asked for yet', () => {
    beforeEach(async () => {
      grantCamera(false);
      requestPermission.mockResolvedValue(true);
      ({ result } = await renderAim());
    });

    describe('when the user turns the camera on', () => {
      beforeEach(async () => {
        await toggleCamera();
      });

      test('then it asks for camera access', () => {
        expect(requestPermission).toHaveBeenCalled();
      });

      test('then the camera stays off until access is granted', () => {
        expect(result.current.cameraOn).toBe(false);
      });
    });
  });

  describe('given camera access hasn’t been asked for and the user will refuse it', () => {
    beforeEach(async () => {
      grantCamera(false);
      requestPermission.mockResolvedValue(false);
      ({ result } = await renderAim());
    });

    describe('when the user turns the camera on', () => {
      beforeEach(async () => {
        await toggleCamera();
      });

      test('then the camera stays off', () => {
        expect(result.current.cameraOn).toBe(false);
      });
    });
  });

  describe('given camera access is denied for good', () => {
    let openSettings: jest.SpyInstance;

    beforeEach(async () => {
      grantCamera(false, false);
      openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
      ({ result } = await renderAim());
    });

    describe('when the user opens Settings', () => {
      beforeEach(() => {
        result.current.openSettings();
      });

      test('then it reports camera access as denied', () => {
        expect(result.current.denied).toBe(true);
      });

      test('then it sends the user to Settings', () => {
        expect(openSettings).toHaveBeenCalled();
      });
    });
  });

  describe('given the Moon is up', () => {
    describe('when it renders', () => {
      beforeEach(async () => {
        ({ result } = await renderAim({ now: MOON_UP }));
      });

      test('then the Moon is up to calibrate on', () => {
        expect(result.current.moonUp).toBe(true);
      });
    });
  });

  describe('given the Moon is down', () => {
    describe('when it renders', () => {
      beforeEach(async () => {
        ({ result } = await renderAim({ now: MOON_DOWN }));
      });

      test('then the Moon isn’t up to calibrate on', () => {
        expect(result.current.moonUp).toBe(false);
      });
    });
  });

  describe('given the camera is on', () => {
    beforeEach(async () => {
      ({ result } = await renderAim());
      await toggleCamera();
    });

    describe('when the user starts calibrating', () => {
      beforeEach(async () => {
        await startCalibration();
      });

      test('then it is calibrating', () => {
        expect(result.current.calibrating).toBe(true);
      });
    });
  });

  describe('given the user is calibrating with the camera 5° right of and 3° below the Moon', () => {
    beforeEach(async () => {
      ({ result } = await renderAim({
        raw: { azimuth: moon.azimuth + 5, elevation: moon.elevation - 3 },
      }));
      await toggleCamera();
      await startCalibration();
    });

    describe('when the user sets the calibration', () => {
      beforeEach(async () => {
        await act(async () => result.current.setCalibration());
      });

      test('then it saves the offset to the Moon', () => {
        const { offset } = useCalibrationStore.getState();
        expect(offset!.azimuth).toBeCloseTo(-5, 6);
        expect(offset!.elevation).toBeCloseTo(3, 6);
      });

      test('then it records when it was calibrated', () => {
        expect(useCalibrationStore.getState().calibratedAt).toBe(MOON_UP);
        expect(result.current.calibratedAt).toBe(MOON_UP);
      });

      test('then it leaves calibration mode', () => {
        expect(result.current.calibrating).toBe(false);
      });
    });
  });

  describe('given the user is calibrating with the camera aimed 90° from the Moon', () => {
    beforeEach(async () => {
      ({ result } = await renderAim({
        raw: { azimuth: moon.azimuth + 90, elevation: moon.elevation },
      }));
      await toggleCamera();
      await startCalibration();
    });

    describe('when the user sets the calibration', () => {
      beforeEach(async () => {
        await act(async () => result.current.setCalibration());
      });

      test('then it says the reading is too far from the Moon', () => {
        expect(result.current.tooFar).toBe(true);
      });

      test('then it keeps calibrating', () => {
        expect(result.current.calibrating).toBe(true);
      });

      test('then it saves no offset', () => {
        expect(useCalibrationStore.getState().offset).toBeNull();
      });
    });
  });

  describe('given the user is calibrating', () => {
    beforeEach(async () => {
      ({ result } = await renderAim());
      await toggleCamera();
      await startCalibration();
    });

    describe('when the user cancels the calibration', () => {
      beforeEach(async () => {
        await act(async () => result.current.cancelCalibration());
      });

      test('then it stops calibrating', () => {
        expect(result.current.calibrating).toBe(false);
      });
    });
  });

  describe('given the user was calibrating and turned the camera off', () => {
    beforeEach(async () => {
      ({ result } = await renderAim());
      await toggleCamera();
      await startCalibration();
      await toggleCamera();
    });

    describe('when the user turns the camera back on', () => {
      beforeEach(async () => {
        await toggleCamera();
      });

      test('then it isn’t calibrating', () => {
        expect(result.current.calibrating).toBe(false);
      });
    });
  });
});
