import { act, render, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useSettingsStore } from '@/stores/settingsStore';
import { Text } from '@/ui/Text';

import { LocationProvider, useLocation, type LocationState } from '../location';

const UNDETERMINED = {
  status: 'undetermined',
  granted: false,
  canAskAgain: true,
} as Location.LocationPermissionResponse;

const GRANTED = {
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
} as Location.LocationPermissionResponse;

const LONDON_FIX = {
  coords: { latitude: 51.5, longitude: -0.13, altitude: 20 },
} as Location.LocationObject;

const EDINBURGH_FIX = {
  coords: { latitude: 55.95, longitude: -3.19, altitude: 80 },
} as Location.LocationObject;

const SAVED_LOCATION = { latitude: 51.5, longitude: -0.13, altitude: 0 };

let mockPermission: Location.LocationPermissionResponse = UNDETERMINED;
let mockCurrentPosition: Location.LocationObject | Error | undefined;

jest.mock('expo-location', () => ({
  PermissionStatus: { UNDETERMINED: 'undetermined' },
  Accuracy: { Balanced: 3, High: 4 },
  getForegroundPermissionsAsync: jest.fn(async () => mockPermission),
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'denied',
    granted: false,
    canAskAgain: true,
  })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async () => {
    if (mockCurrentPosition instanceof Error) {
      throw mockCurrentPosition;
    }
    return mockCurrentPosition;
  }),
  watchPositionAsync: jest.fn(),
}));

jest.mock('../estimatedLocation', () => ({
  estimatedObserver: () => ({ latitude: 40.42, longitude: -3.7, altitude: 0 }),
}));

const request = jest.mocked(Location.requestForegroundPermissionsAsync);
const current = jest.mocked(Location.getCurrentPositionAsync);
const watch = jest.mocked(Location.watchPositionAsync);
const stopWatching = jest.fn();
let sendFix: Location.LocationCallback | null = null;

beforeEach(() => {
  request.mockClear();
  current.mockClear();
  stopWatching.mockClear();
  sendFix = null;
  watch.mockReset().mockImplementation(async (_options, callback) => {
    sendFix = callback;
    return { remove: stopWatching };
  });
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

function Probe() {
  return <Text testID="state">{JSON.stringify(useLocation().state)}</Text>;
}

function shownState(): LocationState {
  return JSON.parse(String(screen.getByTestId('state').props.children));
}

async function launch() {
  await render(
    <LocationProvider fixed={null}>
      <Probe />
    </LocationProvider>,
  );
  await act(async () => {});
}

describe('LocationProvider', () => {
  describe('given onboarding is unfinished and location permission hasn’t been asked for', () => {
    beforeEach(() => {
      useSettingsStore.setState({ onboardingComplete: false });
      mockPermission = UNDETERMINED;
      mockCurrentPosition = undefined;
    });

    describe('when the app launches', () => {
      beforeEach(async () => {
        await launch();
      });

      test('then it doesn’t ask for location', () => {
        expect(request).not.toHaveBeenCalled();
      });
    });
  });

  describe('given onboarding is finished and location permission hasn’t been asked for', () => {
    beforeEach(() => {
      useSettingsStore.setState({ onboardingComplete: true });
      mockPermission = UNDETERMINED;
      mockCurrentPosition = undefined;
    });

    describe('when the app launches', () => {
      beforeEach(async () => {
        await launch();
      });

      test('then it asks for location once', () => {
        expect(request).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given location permission and a fix available', () => {
    beforeEach(() => {
      mockPermission = GRANTED;
      mockCurrentPosition = LONDON_FIX;
    });

    describe('when the app launches', () => {
      beforeEach(async () => {
        await launch();
      });

      test('then it never shows the Android location accuracy prompt', () => {
        expect(current).toHaveBeenCalledWith(
          expect.objectContaining({ mayShowUserSettingsDialog: false }),
        );
      });
    });
  });

  describe('given location permission, no fix and no saved location', () => {
    beforeEach(() => {
      mockPermission = GRANTED;
      mockCurrentPosition = new Error('timed out');
      useSettingsStore.setState({ lastLocation: null });
    });

    describe('when the app launches', () => {
      beforeEach(async () => {
        await launch();
      });

      test('then it uses the estimate', () => {
        expect(shownState()).toEqual({
          status: 'ready',
          observer: { latitude: 40.42, longitude: -3.7, altitude: 0 },
          estimated: true,
        });
      });

      test('then it keeps listening for a fix without the Android location accuracy prompt', () => {
        expect(watch).toHaveBeenCalledWith(
          expect.objectContaining({ mayShowUserSettingsDialog: false }),
          expect.any(Function),
        );
      });

      test('then it doesn’t save the estimate as the last location', () => {
        expect(useSettingsStore.getState().lastLocation).toBeNull();
      });
    });
  });

  describe('given the app launched on an estimate while waiting for a fix', () => {
    beforeEach(async () => {
      mockPermission = GRANTED;
      mockCurrentPosition = new Error('timed out');
      useSettingsStore.setState({ lastLocation: null });
      await launch();
    });

    describe('when the first fix arrives', () => {
      beforeEach(async () => {
        await act(async () => sendFix!(EDINBURGH_FIX));
      });

      test('then it switches to the fix', () => {
        expect(shownState()).toMatchObject({ status: 'ready', observer: { latitude: 55.95 } });
      });

      test('then the location is no longer an estimate', () => {
        expect(shownState()).not.toHaveProperty('estimated');
      });

      test('then it stops listening for a fix', () => {
        expect(stopWatching).toHaveBeenCalled();
      });
    });
  });

  describe('given location permission, no fix and a saved location', () => {
    beforeEach(() => {
      mockPermission = GRANTED;
      mockCurrentPosition = new Error('timed out');
      useSettingsStore.setState({ lastLocation: SAVED_LOCATION });
    });

    describe('when the app launches', () => {
      beforeEach(async () => {
        await launch();
      });

      test('then it doesn’t listen for a fix', () => {
        expect(watch).not.toHaveBeenCalled();
      });
    });
  });
});
