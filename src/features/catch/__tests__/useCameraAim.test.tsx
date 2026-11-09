import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { moonLookAngles } from '@/domain/moon';
import { toGeodetic } from '@/domain/observer';
import type { SkyPosition } from '@/domain/sky';
import { ClockProvider } from '@/environment/clock';
import { useCalibrationStore } from '@/stores/calibrationStore';

import { useCameraAim } from '../useCameraAim';
import type { Pointing, PointingMode } from '../usePointing';

jest.mock('react-native-vision-camera', () => ({
  useCameraDevice: jest.fn(),
  useCameraPermission: jest.fn(),
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
  jest.mocked(useCameraPermission).mockReturnValue({
    hasPermission,
    canRequestPermission,
    requestPermission,
  } as unknown as ReturnType<typeof useCameraPermission>);
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

beforeEach(() => {
  jest.clearAllMocks();
  useCalibrationStore.setState(useCalibrationStore.getInitialState());
  jest.mocked(useCameraDevice).mockReturnValue(BACK_CAMERA);
  grantCamera(true);
  requestPermission.mockResolvedValue(true);
});

describe('useCameraAim', () => {
  test('offers the camera with sensors and a back camera', async () => {
    const { result } = await renderAim();

    expect(result.current.available).toBe(true);
    expect(result.current.cameraOn).toBe(false);
  });

  test.each([
    ['in demo mode', { allowed: false }],
    ['in drag-to-aim', { mode: 'manual' as const }],
  ])('offers no camera %s', async (_, options) => {
    const { result } = await renderAim(options);

    expect(result.current.available).toBe(false);
  });

  test('offers no camera on a phone without a back camera', async () => {
    jest.mocked(useCameraDevice).mockReturnValue(undefined);

    const { result } = await renderAim();

    expect(result.current.available).toBe(false);
  });

  test('turns the camera on and off', async () => {
    const { result } = await renderAim();

    await act(() => result.current.toggleCamera());
    expect(result.current.cameraOn).toBe(true);
    expect(requestPermission).not.toHaveBeenCalled();

    await act(() => result.current.toggleCamera());
    expect(result.current.cameraOn).toBe(false);
  });

  test('asks for camera access the first time', async () => {
    grantCamera(false);
    const { result } = await renderAim();

    await act(() => result.current.toggleCamera());

    expect(requestPermission).toHaveBeenCalled();
    expect(result.current.cameraOn).toBe(false);
  });

  test('stays off when camera access is refused', async () => {
    grantCamera(false);
    requestPermission.mockResolvedValue(false);
    const { result } = await renderAim();

    await act(() => result.current.toggleCamera());

    expect(result.current.cameraOn).toBe(false);
  });

  test('sends the user to Settings once camera access is denied for good', async () => {
    grantCamera(false, false);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const { result } = await renderAim();

    result.current.openSettings();

    expect(result.current.denied).toBe(true);
    expect(openSettings).toHaveBeenCalled();
  });

  test('knows whether the Moon is up to calibrate on', async () => {
    const up = await renderAim();
    const down = await renderAim({ now: MOON_DOWN });

    expect(up.result.current.moonUp).toBe(true);
    expect(down.result.current.moonUp).toBe(false);
  });

  test('calibrates on the Moon and leaves calibration mode', async () => {
    const { result } = await renderAim();
    await act(() => result.current.toggleCamera());
    await act(async () => result.current.startCalibration());
    expect(result.current.calibrating).toBe(true);

    await act(async () => result.current.setCalibration());

    const { offset, calibratedAt } = useCalibrationStore.getState();
    expect(offset!.azimuth).toBeCloseTo(-5, 6);
    expect(offset!.elevation).toBeCloseTo(3, 6);
    expect(calibratedAt).toBe(MOON_UP);
    expect(result.current.calibrating).toBe(false);
    expect(result.current.calibratedAt).toBe(MOON_UP);
  });

  test('refuses a calibration aimed at the wrong thing', async () => {
    const { result } = await renderAim({
      raw: { azimuth: moon.azimuth + 90, elevation: moon.elevation },
    });
    await act(() => result.current.toggleCamera());
    await act(async () => result.current.startCalibration());

    await act(async () => result.current.setCalibration());

    expect(result.current.tooFar).toBe(true);
    expect(result.current.calibrating).toBe(true);
    expect(useCalibrationStore.getState().offset).toBeNull();
  });

  test('stops calibrating when cancelled or when the camera turns off', async () => {
    const { result } = await renderAim();
    await act(() => result.current.toggleCamera());

    await act(async () => result.current.startCalibration());
    await act(async () => result.current.cancelCalibration());
    expect(result.current.calibrating).toBe(false);

    await act(async () => result.current.startCalibration());
    await act(() => result.current.toggleCamera());
    await act(() => result.current.toggleCamera());
    expect(result.current.calibrating).toBe(false);
  });
});
