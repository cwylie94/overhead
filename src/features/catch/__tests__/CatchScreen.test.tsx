import { render, screen } from '@testing-library/react-native';

import type { LocationState } from '@/environment/location';

import { CatchScreen } from '../CatchScreen';

const MADRID = { latitude: 40.42, longitude: -3.7, altitude: 0 };
const ESTIMATE: LocationState = { status: 'ready', observer: MADRID, estimated: true };
const FIX: LocationState = { status: 'ready', observer: MADRID };
let mockLocation: LocationState = ESTIMATE;

jest.mock('react-native-reanimated', () => jest.requireActual('@/testing/reanimated'));
jest.mock('react-native-gesture-handler', () => ({ Gesture: {}, GestureDetector: () => null }));
jest.mock('@/ui/motion', () => ({ ALWAYS_ANIMATE: {} }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ passId: '7' }),
}));
jest.mock('@/data/AppDataContext', () => ({ useAppData: () => ({ db: {} }) }));
jest.mock('@/data/queries', () => ({ passWithSatelliteQuery: () => ({ get: () => undefined }) }));
jest.mock('@/session/appSession', () => ({
  useSessionFeatures: () => jest.requireActual('@/session/features').DEVICE_FEATURES,
}));
jest.mock('@/environment/location', () => ({
  ...jest.requireActual('@/environment/location'),
  useLocation: () => ({ state: mockLocation }),
}));
jest.mock('../CatchCanvas', () => ({ CatchCanvas: () => null, POINTS_PER_DEGREE: 10 }));
jest.mock('../CameraCatchView', () => ({ CameraCatchView: () => null }));
jest.mock('../CaughtOverlay', () => ({ CaughtOverlay: () => null }));
jest.mock('../CalibrationControls', () => ({ CalibrationControls: () => null }));
jest.mock('../useCameraAim', () => ({ useCameraAim: jest.fn() }));
jest.mock('../usePointing', () => ({ usePointing: jest.fn() }));
jest.mock('../useCatchSession', () => ({ useCatchSession: jest.fn() }));

const FINDING = 'Finding your location. You can catch once it’s found.';
const FOUND = 'Found your location. Go back to see the passes from where you are.';
const PASS_NOT_VISIBLE = "This pass isn't visible right now";

describe('CatchScreen', () => {
  describe('given the location is only an estimate', () => {
    beforeEach(() => {
      mockLocation = ESTIMATE;
    });

    describe('when the screen opens', () => {
      beforeEach(async () => {
        await render(<CatchScreen />);
      });

      test('then it says it is finding your location', () => {
        expect(screen.getByText(FINDING)).toBeOnTheScreen();
      });

      test('then it offers Done to leave', () => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeOnTheScreen();
      });
    });
  });

  describe('given the screen opened on an estimate', () => {
    beforeEach(async () => {
      mockLocation = ESTIMATE;
      await render(<CatchScreen />);
    });

    describe('when a real location arrives', () => {
      beforeEach(async () => {
        mockLocation = FIX;
        await screen.rerender(<CatchScreen />);
      });

      test('then it sends the user back for the passes from where they are', () => {
        expect(screen.getByText(FOUND)).toBeOnTheScreen();
      });
    });
  });

  describe('given a real location and a pass that isn’t visible now', () => {
    beforeEach(() => {
      mockLocation = FIX;
    });

    describe('when the screen opens', () => {
      beforeEach(async () => {
        await render(<CatchScreen />);
      });

      test('then it doesn’t wait for a location', () => {
        expect(screen.queryByText(FINDING)).toBeNull();
      });

      test('then it goes straight to the pass', () => {
        expect(screen.getByText(PASS_NOT_VISIBLE)).toBeOnTheScreen();
      });
    });
  });
});
