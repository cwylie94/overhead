import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { requestReminderPermission } from '@/reminders/reminders';
import { useSettingsStore } from '@/stores/settingsStore';

import { OnboardingScreen } from '../OnboardingScreen';

const mockAskPermission = jest.fn<Promise<boolean>, []>();

jest.mock('expo-router', () => ({ Redirect: () => null, router: { push: jest.fn() } }));
jest.mock('@/session/appSession', () => ({ useDemo: () => null }));
jest.mock('@/environment/location', () => ({
  useLocation: () => ({ state: { status: 'locating' }, askPermission: mockAskPermission }),
}));
jest.mock('@/reminders/reminders', () => ({
  requestReminderPermission: jest.fn(async () => true),
}));
jest.mock('../DomeIllustration', () => ({ DomeIllustration: () => null }));
jest.mock('../CameraSky', () => ({ CameraSky: () => null }));
jest.mock('../LoupeDemo', () => ({ LoupeDemo: () => null }));

const LOCATION_STEP = 'Where are you watching from?';
const MADRID = { name: 'Madrid', country: 'Spain', latitude: 40.4, longitude: -3.7 };

async function press(name: string) {
  await fireEvent.press(screen.getByRole('button', { name }));
}

async function openOnboarding() {
  await render(<OnboardingScreen />);
}

async function goToCameraStep() {
  await openOnboarding();
  await press('Get started');
  await press('Next');
}

async function goToRemindersStep() {
  await goToCameraStep();
  await press('Next');
}

async function skipToLocation() {
  await openOnboarding();
  await press('Skip');
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

describe('OnboardingScreen', () => {
  describe('given the user is on the camera step', () => {
    beforeEach(async () => {
      await goToCameraStep();
    });

    describe('when the user presses Next', () => {
      beforeEach(async () => {
        await press('Next');
      });

      test('then it shows the reminders step as step 4 of 5', () => {
        expect(screen.getByLabelText('Step 4 of 5')).toBeTruthy();
      });
    });
  });

  describe('given the user is on the reminders step', () => {
    beforeEach(async () => {
      await goToRemindersStep();
    });

    describe('when the user presses Not now', () => {
      beforeEach(async () => {
        await press('Not now');
      });

      test('then it ends on the location step', () => {
        expect(screen.getByRole('header', { name: LOCATION_STEP })).toBeTruthy();
      });

      test('then onboarding isn’t finished yet', () => {
        expect(useSettingsStore.getState().onboardingComplete).toBe(false);
      });
    });

    describe('when the user presses Turn on reminders', () => {
      beforeEach(async () => {
        await act(() => press('Turn on reminders'));
      });

      test('then it asks for permission to send reminders', () => {
        expect(requestReminderPermission).toHaveBeenCalled();
      });

      test('then it moves on to the location step', () => {
        expect(screen.getByRole('header', { name: LOCATION_STEP })).toBeTruthy();
      });
    });
  });

  describe('given onboarding is open', () => {
    beforeEach(async () => {
      await openOnboarding();
    });

    describe('when the user presses Skip', () => {
      beforeEach(async () => {
        await press('Skip');
      });

      test('then it goes straight to the location step', () => {
        expect(screen.getByRole('header', { name: LOCATION_STEP })).toBeTruthy();
      });

      test('then it says it is step 5 of 5', () => {
        expect(screen.getByLabelText('Step 5 of 5')).toBeTruthy();
      });
    });
  });

  describe('given the user will allow location and has skipped to the location step', () => {
    beforeEach(async () => {
      mockAskPermission.mockResolvedValue(true);
      await skipToLocation();
    });

    describe('when the user presses Use my location', () => {
      beforeEach(async () => {
        await act(() => press('Use my location'));
      });

      test('then onboarding is finished', () => {
        expect(useSettingsStore.getState().onboardingComplete).toBe(true);
      });

      test('then it doesn’t open the city picker', () => {
        expect(router.push).not.toHaveBeenCalled();
      });
    });
  });

  describe('given the user will refuse location and has skipped to the location step', () => {
    beforeEach(async () => {
      mockAskPermission.mockResolvedValue(false);
      await skipToLocation();
    });

    describe('when the user presses Use my location', () => {
      beforeEach(async () => {
        await act(() => press('Use my location'));
      });

      test('then it opens the city picker', () => {
        expect(router.push).toHaveBeenCalledWith('/location');
      });

      test('then onboarding isn’t finished yet', () => {
        expect(useSettingsStore.getState().onboardingComplete).toBe(false);
      });
    });
  });

  describe('given the user has chosen Madrid', () => {
    beforeEach(async () => {
      useSettingsStore.setState({ customLocation: MADRID });
      await openOnboarding();
    });

    describe('when the user presses Skip', () => {
      beforeEach(async () => {
        await press('Skip');
      });

      test('then the location step shows Madrid', () => {
        expect(screen.getByText('Madrid, Spain')).toBeTruthy();
      });
    });
  });

  describe('given the user has chosen Madrid and skipped to the location step', () => {
    beforeEach(async () => {
      useSettingsStore.setState({ customLocation: MADRID });
      await skipToLocation();
    });

    describe('when the user presses Continue', () => {
      beforeEach(async () => {
        await press('Continue');
      });

      test('then onboarding is finished', () => {
        expect(useSettingsStore.getState().onboardingComplete).toBe(true);
      });
    });
  });

  describe('given the user has skipped to the location step', () => {
    beforeEach(async () => {
      await skipToLocation();
    });

    describe('when the user presses Try the demo', () => {
      beforeEach(async () => {
        await press('Try the demo');
      });

      test('then demo mode is on', () => {
        expect(useSettingsStore.getState().demoMode).toBe(true);
      });

      test('then onboarding isn’t finished', () => {
        expect(useSettingsStore.getState().onboardingComplete).toBe(false);
      });
    });
  });
});
