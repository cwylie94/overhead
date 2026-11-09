import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { requestReminderPermission } from '@/features/tonight/reminders';
import { useSettingsStore } from '@/stores/settingsStore';

import { OnboardingScreen } from '../OnboardingScreen';

const mockAskPermission = jest.fn<Promise<boolean>, []>();

jest.mock('expo-router', () => ({ Redirect: () => null, router: { push: jest.fn() } }));
jest.mock('@/demo/session', () => ({ useDemo: () => null }));
jest.mock('@/environment/location', () => ({
  useLocation: () => ({ state: { status: 'locating' }, askPermission: mockAskPermission }),
}));
jest.mock('@/features/tonight/reminders', () => ({
  requestReminderPermission: jest.fn(async () => true),
}));
jest.mock('../DomeIllustration', () => ({ DomeIllustration: () => null }));
jest.mock('../CameraSky', () => ({ CameraSky: () => null }));
jest.mock('../LoupeDemo', () => ({ LoupeDemo: () => null }));

const LOCATION_STEP = 'Where are you watching from?';

async function press(name: string) {
  await fireEvent.press(screen.getByRole('button', { name }));
}

async function skipToLocation() {
  await render(<OnboardingScreen />);
  await press('Skip');
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

describe('OnboardingScreen', () => {
  test('ends on the location step after the reminders step', async () => {
    await render(<OnboardingScreen />);

    await press('Get started');
    await press('Next');
    await press('Next');
    expect(screen.getByLabelText('Step 4 of 5')).toBeTruthy();
    await press('Not now');

    expect(screen.getByRole('header', { name: LOCATION_STEP })).toBeTruthy();
    expect(useSettingsStore.getState().onboardingComplete).toBe(false);
  });

  test('turning on reminders asks for permission, then moves on', async () => {
    await render(<OnboardingScreen />);
    await press('Get started');
    await press('Next');
    await press('Next');

    await act(() => press('Turn on reminders'));

    expect(requestReminderPermission).toHaveBeenCalled();
    expect(screen.getByRole('header', { name: LOCATION_STEP })).toBeTruthy();
  });

  test('skipping goes straight to the location step', async () => {
    await skipToLocation();

    expect(screen.getByRole('header', { name: LOCATION_STEP })).toBeTruthy();
    expect(screen.getByLabelText('Step 5 of 5')).toBeTruthy();
  });

  test('using the location finishes onboarding', async () => {
    mockAskPermission.mockResolvedValue(true);
    await skipToLocation();

    await act(() => press('Use my location'));

    expect(useSettingsStore.getState().onboardingComplete).toBe(true);
    expect(router.push).not.toHaveBeenCalled();
  });

  test('a refused location opens the city picker', async () => {
    mockAskPermission.mockResolvedValue(false);
    await skipToLocation();

    await act(() => press('Use my location'));

    expect(router.push).toHaveBeenCalledWith('/location');
    expect(useSettingsStore.getState().onboardingComplete).toBe(false);
  });

  test('a chosen city is shown and Continue finishes onboarding', async () => {
    useSettingsStore.setState({
      customLocation: { name: 'Madrid', country: 'Spain', latitude: 40.4, longitude: -3.7 },
    });
    await skipToLocation();

    expect(screen.getByText('Madrid, Spain')).toBeTruthy();
    await press('Continue');

    expect(useSettingsStore.getState().onboardingComplete).toBe(true);
  });

  test('the demo can be started from the location step', async () => {
    await skipToLocation();

    await press('Try the demo');

    expect(useSettingsStore.getState().demoMode).toBe(true);
    expect(useSettingsStore.getState().onboardingComplete).toBe(false);
  });
});
