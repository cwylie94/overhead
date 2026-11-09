import { act, render } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useSettingsStore } from '@/stores/settingsStore';

import { LocationProvider } from '../location';

jest.mock('expo-location', () => ({
  PermissionStatus: { UNDETERMINED: 'undetermined' },
  Accuracy: { Balanced: 3 },
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
}));

const request = jest.mocked(Location.requestForegroundPermissionsAsync);

beforeEach(() => {
  request.mockClear();
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

async function launch() {
  render(<LocationProvider fixed={null}>{null}</LocationProvider>);
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
