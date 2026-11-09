import { render, screen } from '@testing-library/react-native';

import type { LocationState } from '@/environment/location';

import { CatchScreen } from '../CatchScreen';

const MADRID = { latitude: 40.42, longitude: -3.7, altitude: 0 };
let mockState: LocationState = { status: 'ready', observer: MADRID, estimated: true };

jest.mock('react-native-reanimated', () => jest.requireActual('@/testing/reanimated'));
jest.mock('react-native-gesture-handler', () => ({ Gesture: {}, GestureDetector: () => null }));
jest.mock('@/ui/motion', () => ({ ALWAYS_ANIMATE: {} }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ passId: '7' }),
}));
jest.mock('@/data/AppDataContext', () => ({ useAppData: () => ({ db: {} }) }));
jest.mock('@/data/queries', () => ({ passWithSatelliteQuery: () => ({ get: () => undefined }) }));
jest.mock('@/demo/session', () => ({ useDemo: () => null }));
jest.mock('@/environment/location', () => ({
  ...jest.requireActual('@/environment/location'),
  useLocation: () => ({ state: mockState }),
}));
jest.mock('../CatchCanvas', () => ({ CatchCanvas: () => null, POINTS_PER_DEGREE: 10 }));
jest.mock('../CameraCatchView', () => ({ CameraCatchView: () => null }));
jest.mock('../CaughtOverlay', () => ({ CaughtOverlay: () => null }));
jest.mock('../CalibrationControls', () => ({ CalibrationControls: () => null }));
jest.mock('../useCameraAim', () => ({ useCameraAim: jest.fn() }));
jest.mock('../usePointing', () => ({ usePointing: jest.fn() }));
jest.mock('../useCatchSession', () => ({ useCatchSession: jest.fn() }));

const FINDING = 'Finding your location. You can catch once it’s found.';

describe('CatchScreen', () => {
  test('waits for a real location before catching', async () => {
    mockState = { status: 'ready', observer: MADRID, estimated: true };

    await render(<CatchScreen />);

    expect(screen.getByText(FINDING)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Done' })).toBeOnTheScreen();
  });

  test('sends people back for the real passes once the location is found', async () => {
    mockState = { status: 'ready', observer: MADRID, estimated: true };
    const { rerender } = await render(<CatchScreen />);

    mockState = { status: 'ready', observer: MADRID };
    await rerender(<CatchScreen />);

    expect(
      screen.getByText('Found your location. Go back to see the passes from where you are.'),
    ).toBeOnTheScreen();
  });

  test('goes straight to the pass with a real location', async () => {
    mockState = { status: 'ready', observer: MADRID };

    await render(<CatchScreen />);

    expect(screen.queryByText(FINDING)).toBeNull();
    expect(screen.getByText("This pass isn't visible right now")).toBeOnTheScreen();
  });
});
