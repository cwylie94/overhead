import { act, render } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useSettingsStore } from '@/stores/settingsStore';

import { LocationProvider } from '../location';

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
}));

const request = jest.mocked(Location.requestForegroundPermissionsAsync);
const permission = jest.mocked(Location.getForegroundPermissionsAsync);
const current = jest.mocked(Location.getCurrentPositionAsync);

const GRANTED = {
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
} as Location.LocationPermissionResponse;

beforeEach(() => {
  request.mockClear();
  current.mockReset();
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

async function launch() {
  await render(<LocationProvider fixed={null}>{null}</LocationProvider>);
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
