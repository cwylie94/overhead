import { act, render, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useSettingsStore } from '@/stores/settingsStore';
import { Text } from '@/ui/Text';

import { LocationProvider, useLocation, type LocationState } from '../location';

jest.mock('expo-location', () => ({
  PermissionStatus: { UNDETERMINED: 'undetermined' },
  Accuracy: { Balanced: 3, High: 4 },
  getForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'undetermined',
    granted: false,
    canAskAgain: true,
  })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'denied',
    granted: false,
    canAskAgain: true,
  })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

jest.mock('../estimatedLocation', () => ({
  estimatedObserver: () => ({ latitude: 40.42, longitude: -3.7, altitude: 0 }),
}));

const request = jest.mocked(Location.requestForegroundPermissionsAsync);
const permission = jest.mocked(Location.getForegroundPermissionsAsync);
const current = jest.mocked(Location.getCurrentPositionAsync);
const watch = jest.mocked(Location.watchPositionAsync);
const stopWatching = jest.fn();
let sendFix: Location.LocationCallback | null = null;

const GRANTED = {
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
} as Location.LocationPermissionResponse;

beforeEach(() => {
  request.mockClear();
  current.mockReset();
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

test('does not ask for location at launch while onboarding is unfinished', async () => {
  await launch();

  expect(request).not.toHaveBeenCalled();
});

test('asks for location at launch once onboarding is finished', async () => {
  useSettingsStore.setState({ onboardingComplete: true });

  await launch();

  expect(request).toHaveBeenCalledTimes(1);
});

test('never shows the Android location accuracy prompt', async () => {
  permission.mockResolvedValueOnce(GRANTED);
  current.mockResolvedValueOnce({
    coords: { latitude: 51.5, longitude: -0.13, altitude: 20 },
  } as Location.LocationObject);

  await launch();

  expect(current).toHaveBeenCalledWith(
    expect.objectContaining({ mayShowUserSettingsDialog: false }),
  );
});

describe('without a fix', () => {
  beforeEach(() => {
    permission.mockResolvedValue(GRANTED);
    current.mockRejectedValue(new Error('timed out'));
  });

  afterEach(() => {
    permission.mockReset().mockResolvedValue({
      status: 'undetermined',
      granted: false,
      canAskAgain: true,
    } as Location.LocationPermissionResponse);
  });

  test('uses the estimate and keeps listening for a fix', async () => {
    await launch();

    expect(shownState()).toEqual({
      status: 'ready',
      observer: { latitude: 40.42, longitude: -3.7, altitude: 0 },
      estimated: true,
    });
    expect(watch).toHaveBeenCalledWith(
      expect.objectContaining({ mayShowUserSettingsDialog: false }),
      expect.any(Function),
    );
    expect(useSettingsStore.getState().lastLocation).toBeNull();
  });

  test('switches to the first fix and stops listening', async () => {
    await launch();

    await act(async () =>
      sendFix!({
        coords: { latitude: 55.95, longitude: -3.19, altitude: 80 },
      } as Location.LocationObject),
    );

    expect(shownState()).toMatchObject({ status: 'ready', observer: { latitude: 55.95 } });
    expect(shownState()).not.toHaveProperty('estimated');
    expect(stopWatching).toHaveBeenCalled();
  });

  test('does not listen once a location is saved', async () => {
    useSettingsStore.setState({ lastLocation: { latitude: 51.5, longitude: -0.13, altitude: 0 } });

    await launch();

    expect(watch).not.toHaveBeenCalled();
  });
});
