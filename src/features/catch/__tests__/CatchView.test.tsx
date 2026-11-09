import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { UpcomingPass } from '@/data/queries';

import { CatchView, type CatchViewProps } from '../CatchView';
import type { AimGesture } from '../useAimGesture';
import type { CameraAim } from '../useCameraAim';

function mockPart(testID: string) {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return () => createElement(View, { testID });
}

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: unknown }) => children,
}));
jest.mock('../CatchCanvas', () => ({ CatchCanvas: mockPart('catch-sky') }));
jest.mock('../CameraCatchView', () => ({ CameraCatchView: mockPart('camera-sky') }));
jest.mock('../CaughtOverlay', () => ({ CaughtOverlay: mockPart('caught') }));
jest.mock('../CalibrationControls', () => ({ CalibrationControls: mockPart('calibration') }));

const MINUTE = 60_000;
const NOW = Date.UTC(2026, 10, 9, 20, 0);
const PASS = {
  id: 7,
  noradId: 25544,
  name: 'ISS (ZARYA)',
  startAt: NOW + 2 * MINUTE,
  track: [],
} as unknown as UpcomingPass;
const shared = { get: () => 0 } as unknown as SharedValue<number>;
const MADRID = { name: 'Madrid', country: 'Spain', latitude: 40.4, longitude: -3.7 };

const toggleCamera = jest.fn(async () => {});
const openSettings = jest.fn();
const onDone = jest.fn();

const NO_CAMERA: CameraAim = {
  device: undefined,
  available: false,
  cameraOn: false,
  denied: false,
  moon: null,
  moonUp: false,
  calibrating: false,
  tooFar: false,
  calibratedAt: null,
  toggleCamera,
  openSettings,
  startCalibration: jest.fn(),
  setCalibration: jest.fn(),
  cancelCalibration: jest.fn(),
};

function props(overrides: Partial<CatchViewProps> = {}): CatchViewProps {
  return {
    pass: PASS,
    now: NOW,
    phase: 'aiming',
    caught: null,
    look: { azimuth: 45, elevation: 39.6 },
    chosenLocation: null,
    calibrate: false,
    manual: false,
    gesture: {} as AimGesture,
    sky: { time: shared, progress: shared, azimuth: shared, elevation: shared, roll: shared },
    aim: NO_CAMERA,
    onDone,
    ...overrides,
  };
}

async function renderView(overrides: Partial<CatchViewProps> = {}) {
  await render(<CatchView {...props(overrides)} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CatchView', () => {
  describe('given the satellite is up and the user is aiming', () => {
    beforeEach(async () => {
      await renderView({ phase: 'aiming' });
    });

    test('then it names the satellite to catch', () => {
      expect(screen.getByRole('header', { name: 'Catch ISS (ZARYA)' })).toBeOnTheScreen();
    });

    test('then it says where to look', () => {
      expect(screen.getByText('Look NE, 40° up')).toBeOnTheScreen();
    });

    test('then it asks the user to line up the crosshair', () => {
      expect(screen.getByText('Line up the crosshair with the satellite')).toBeOnTheScreen();
    });

    test('then it asks the user to hold the crosshair on it', () => {
      expect(screen.getByText('Keep the crosshair on it for 3 seconds')).toBeOnTheScreen();
    });

    test('then it offers no camera', () => {
      expect(screen.queryByRole('button', { name: 'Show camera' })).toBeNull();
    });
  });

  describe('given the pass has not started yet', () => {
    beforeEach(async () => {
      await renderView({ phase: 'waiting' });
    });

    test('then it counts down to the pass', () => {
      expect(
        screen.getByText(/^Appears .+\. Get your bearings in the meantime\.$/),
      ).toBeOnTheScreen();
    });
  });

  describe('given the satellite has gone below the horizon', () => {
    beforeEach(async () => {
      await renderView({ phase: 'notUp', look: null });
    });

    test('then it says the pass is not visible', () => {
      expect(screen.getByText("This pass isn't visible right now")).toBeOnTheScreen();
    });

    test('then it gives no direction to look', () => {
      expect(screen.queryByText(/^Look /)).toBeNull();
    });
  });

  describe('given the user is aiming by dragging', () => {
    beforeEach(async () => {
      await renderView({ manual: true });
    });

    test('then it explains how to drag and hold', () => {
      expect(screen.getByText('Drag to aim. Keep your finger down to hold.')).toBeOnTheScreen();
    });
  });

  describe('given the user has chosen a city', () => {
    beforeEach(async () => {
      await renderView({ chosenLocation: MADRID });
    });

    test('then it says the passes are for that city', () => {
      expect(screen.getByText(/Madrid, Spain/)).toBeOnTheScreen();
    });
  });

  describe('given the compass needs calibrating', () => {
    beforeEach(async () => {
      await renderView({ calibrate: true });
    });

    test('then it asks for a figure of eight', () => {
      expect(
        screen.getByText('Your compass needs calibrating. Move your phone in a figure of eight.'),
      ).toBeOnTheScreen();
    });
  });

  describe('given the view has been laid out', () => {
    beforeEach(async () => {
      await renderView();
      fireEvent(screen.getByTestId('catch-canvas'), 'layout', {
        nativeEvent: { layout: { width: 320 } },
      });
    });

    test('then it draws the sky', () => {
      expect(screen.getByTestId('catch-sky')).toBeOnTheScreen();
    });
  });

  describe('given the camera can be used but is off', () => {
    beforeEach(async () => {
      await renderView({ aim: { ...NO_CAMERA, available: true } });
    });

    describe('when the user shows the camera', () => {
      beforeEach(() => {
        fireEvent.press(screen.getByRole('button', { name: 'Show camera' }));
      });

      test('then it turns the camera on', () => {
        expect(toggleCamera).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given the camera is on', () => {
    beforeEach(async () => {
      await renderView({
        aim: { ...NO_CAMERA, available: true, cameraOn: true, device: {} as CameraAim['device'] },
      });
    });

    test('then it shows the sky through the camera', () => {
      expect(screen.getByTestId('camera-sky')).toBeOnTheScreen();
    });

    test('then it offers Moon calibration', () => {
      expect(screen.getByTestId('calibration')).toBeOnTheScreen();
    });

    test('then it offers to hide the camera', () => {
      expect(screen.getByRole('button', { name: 'Hide camera' })).toBeOnTheScreen();
    });
  });

  describe('given camera access has been turned off', () => {
    beforeEach(async () => {
      await renderView({ aim: { ...NO_CAMERA, available: true, denied: true } });
    });

    describe('when the user opens Settings', () => {
      beforeEach(() => {
        fireEvent.press(screen.getByText('Open Settings'));
      });

      test('then it opens the app’s settings', () => {
        expect(openSettings).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given the satellite has been caught', () => {
    beforeEach(async () => {
      await renderView({
        phase: 'caught',
        caught: { caughtAt: NOW, angleError: 2.1 },
        aim: { ...NO_CAMERA, available: true, cameraOn: true, device: {} as CameraAim['device'] },
      });
    });

    test('then it shows the catch', () => {
      expect(screen.getByTestId('caught')).toBeOnTheScreen();
    });

    test('then it stops drawing the sky', () => {
      expect(screen.queryByTestId('camera-sky')).toBeNull();
    });
  });

  describe('given the user is catching', () => {
    beforeEach(async () => {
      await renderView();
    });

    describe('when they tap Done', () => {
      beforeEach(() => {
        fireEvent.press(screen.getByRole('button', { name: 'Done' }));
      });

      test('then it leaves', () => {
        expect(onDone).toHaveBeenCalledTimes(1);
      });
    });
  });
});
