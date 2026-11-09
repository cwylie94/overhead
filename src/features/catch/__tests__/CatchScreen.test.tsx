import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { UpcomingPass } from '@/data/queries';
import type { LocationState } from '@/environment/location';

import { CatchScreen } from '../CatchScreen';
import { useCatch } from '../useCatch';

const MADRID = { latitude: 40.42, longitude: -3.7, altitude: 0 };
const ESTIMATE: LocationState = { status: 'ready', observer: MADRID, estimated: true };
const FIX: LocationState = { status: 'ready', observer: MADRID };
const mockPass = { id: 7, name: 'ISS (ZARYA)' } as UpcomingPass;
let mockLocation: LocationState = ESTIMATE;
let mockStoredPass: UpcomingPass | undefined;

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ passId: '7' }),
}));
jest.mock('@/data/AppDataContext', () => ({ useAppData: () => ({ db: {} }) }));
jest.mock('@/data/queries', () => ({
  passWithSatelliteQuery: () => ({ get: () => mockStoredPass }),
}));
jest.mock('@/environment/location', () => ({
  ...jest.requireActual('@/environment/location'),
  useLocation: () => ({ state: mockLocation }),
}));
jest.mock('../useCatch', () => ({ useCatch: jest.fn(() => ({ phase: 'aiming' })) }));
jest.mock('../CatchView', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    CatchView: ({ phase }: { phase: string }) => createElement(Text, null, `catching: ${phase}`),
  };
});

const FINDING = 'Finding your location. You can catch once it’s found.';
const FOUND = 'Found your location. Go back to see the passes from where you are.';
const PASS_NOT_VISIBLE = "This pass isn't visible right now";

beforeEach(() => {
  jest.clearAllMocks();
  mockStoredPass = undefined;
});

describe('CatchScreen', () => {
  describe('given the location is only an estimate', () => {
    beforeEach(() => {
      mockLocation = ESTIMATE;
      mockStoredPass = mockPass;
    });

    describe('when the screen opens', () => {
      beforeEach(async () => {
        await render(<CatchScreen />);
      });

      test('then it says it is finding your location', () => {
        expect(screen.getByText(FINDING)).toBeOnTheScreen();
      });

      test('then it does not start catching', () => {
        expect(useCatch).not.toHaveBeenCalled();
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

    describe('when the user taps Done', () => {
      beforeEach(() => {
        fireEvent.press(screen.getByRole('button', { name: 'Done' }));
      });

      test('then it goes back', () => {
        expect(router.back).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given a real location and a pass that is no longer stored', () => {
    beforeEach(async () => {
      mockLocation = FIX;
      await render(<CatchScreen />);
    });

    test('then it doesn’t wait for a location', () => {
      expect(screen.queryByText(FINDING)).toBeNull();
    });

    test('then it says the pass isn’t visible', () => {
      expect(screen.getByText(PASS_NOT_VISIBLE)).toBeOnTheScreen();
    });
  });

  describe('given a real location and a stored pass', () => {
    beforeEach(async () => {
      mockLocation = FIX;
      mockStoredPass = mockPass;
      await render(<CatchScreen />);
    });

    test('then it starts catching that pass', () => {
      expect(useCatch).toHaveBeenCalledWith(mockPass);
    });

    test('then it shows the catch', () => {
      expect(screen.getByText('catching: aiming')).toBeOnTheScreen();
    });
  });
});
