import { fireEvent, render, screen } from '@testing-library/react-native';

import { MIN_ELEVATION_LIMITS } from '@/stores/settingsStore';

import {
  MIN_ELEVATION_STEP,
  PreferencesSections,
  type PreferenceActions,
  type Preferences,
} from '../PreferencesSections';

const defaults: Preferences = {
  language: null,
  units: 'metric',
  minElevation: 10,
  notificationsEnabled: true,
  hapticsEnabled: true,
  motionPreference: 'system',
};

function makeActions(): jest.Mocked<PreferenceActions> {
  return {
    setLanguage: jest.fn(),
    setUnits: jest.fn(),
    setMinElevation: jest.fn(),
    setNotificationsEnabled: jest.fn(),
    setHapticsEnabled: jest.fn(),
    setMotionPreference: jest.fn(),
  };
}

describe('PreferencesSections', () => {
  let preferences: Preferences;
  let actions: jest.Mocked<PreferenceActions>;

  async function showPreferences() {
    await render(<PreferencesSections preferences={preferences} actions={actions} />);
  }

  beforeEach(() => {
    actions = makeActions();
  });

  describe('given a minimum elevation of 10°', () => {
    beforeEach(() => {
      preferences = { ...defaults, minElevation: 10 };
    });

    describe('when the sections show', () => {
      beforeEach(async () => {
        await showPreferences();
      });

      test('then they show 10°', () => {
        expect(screen.getByText('10°')).toBeOnTheScreen();
      });
    });
  });

  describe('given the sections are showing a minimum elevation of 10°', () => {
    beforeEach(async () => {
      preferences = { ...defaults, minElevation: 10 };
      await showPreferences();
    });

    describe('when the user presses Higher', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Higher' }));
      });

      test('then it raises the minimum elevation by one step', () => {
        expect(actions.setMinElevation.mock.calls).toEqual([[10 + MIN_ELEVATION_STEP]]);
      });
    });

    describe('when the user presses Lower', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Lower' }));
      });

      test('then it lowers the minimum elevation by one step', () => {
        expect(actions.setMinElevation.mock.calls).toEqual([[10 - MIN_ELEVATION_STEP]]);
      });
    });
  });

  describe('given the sections are showing the lowest minimum elevation', () => {
    beforeEach(async () => {
      preferences = { ...defaults, minElevation: MIN_ELEVATION_LIMITS.min };
      await showPreferences();
    });

    describe('when the user presses Lower', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Lower' }));
      });

      test('then the minimum elevation stays where it is', () => {
        expect(actions.setMinElevation).not.toHaveBeenCalled();
      });

      test('then Lower is disabled', () => {
        expect(screen.getByRole('button', { name: 'Lower' })).toBeDisabled();
      });
    });
  });

  describe('given miles and reduced motion are chosen', () => {
    beforeEach(() => {
      preferences = { ...defaults, units: 'imperial', motionPreference: 'reduce' };
    });

    describe('when the sections show', () => {
      beforeEach(async () => {
        await showPreferences();
      });

      test('then Miles is marked', () => {
        expect(screen.getByRole('radio', { name: 'Miles' })).toBeChecked();
      });

      test('then Reduce is marked', () => {
        expect(screen.getByRole('radio', { name: 'Reduce' })).toBeChecked();
      });
    });
  });

  describe('given the sections are showing miles and reduced motion', () => {
    beforeEach(async () => {
      preferences = { ...defaults, units: 'imperial', motionPreference: 'reduce' };
      await showPreferences();
    });

    describe('when the user picks Kilometres', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('radio', { name: 'Kilometres' }));
      });

      test('then it switches to metric units', () => {
        expect(actions.setUnits).toHaveBeenCalledWith('metric');
      });
    });

    describe('when the user picks Full motion', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('radio', { name: 'Full' }));
      });

      test('then it switches to full motion', () => {
        expect(actions.setMotionPreference).toHaveBeenCalledWith('full');
      });
    });
  });

  describe('given Spanish is chosen', () => {
    beforeEach(() => {
      preferences = { ...defaults, language: 'es' };
    });

    describe('when the sections show', () => {
      beforeEach(async () => {
        await showPreferences();
      });

      test('then Español is marked', () => {
        expect(screen.getByRole('radio', { name: 'Español' })).toBeChecked();
      });
    });
  });

  describe('given the sections are showing with Spanish chosen', () => {
    beforeEach(async () => {
      preferences = { ...defaults, language: 'es' };
      await showPreferences();
    });

    describe('when the user picks the phone’s language setting', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getAllByRole('radio', { name: 'Phone setting' })[0]!);
      });

      test('then the language preference is cleared', () => {
        expect(actions.setLanguage.mock.calls).toEqual([[null]]);
      });
    });

    describe('when the user picks English', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('radio', { name: 'English' }));
      });

      test('then the language is set to English', () => {
        expect(actions.setLanguage.mock.calls).toEqual([['en']]);
      });
    });
  });

  describe('given the sections are showing with reminders and haptics on', () => {
    beforeEach(async () => {
      preferences = { ...defaults, notificationsEnabled: true, hapticsEnabled: true };
      await showPreferences();
    });

    describe('when the user switches pass reminders off', () => {
      beforeEach(async () => {
        await fireEvent(
          screen.getByRole('switch', { name: 'Pass reminders' }),
          'valueChange',
          false,
        );
      });

      test('then reminders are turned off', () => {
        expect(actions.setNotificationsEnabled).toHaveBeenCalledWith(false);
      });
    });

    describe('when the user switches haptics off', () => {
      beforeEach(async () => {
        await fireEvent(screen.getByRole('switch', { name: 'Haptics' }), 'valueChange', false);
      });

      test('then haptics are turned off', () => {
        expect(actions.setHapticsEnabled).toHaveBeenCalledWith(false);
      });
    });
  });
});
