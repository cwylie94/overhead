import i18n from '@/translations';

import {
  DEFAULT_MIN_ELEVATION,
  deviceUnitSystem,
  migrateSettings,
  MIN_ELEVATION_LIMITS,
  needsOnboarding,
  unitSystemFor,
  useSettingsStore,
} from '../settingsStore';
import { storeStorage } from '../storage';

type SettingsStore = ReturnType<typeof useSettingsStore.getState>;

const REYKJAVIK = {
  name: 'Reykjavík',
  country: 'Iceland',
  latitude: 64.135,
  longitude: -21.895,
};

function persisted() {
  return JSON.parse(storeStorage.getString('settings') ?? 'null');
}

function saveVersion1Settings(state: object) {
  storeStorage.set('settings', JSON.stringify({ version: 1, state }));
}

beforeEach(() => {
  storeStorage.clearAll();
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

describe('useSettingsStore', () => {
  describe('given the store has just been created', () => {
    test('then it starts with sensible defaults', () => {
      expect(useSettingsStore.getState()).toMatchObject({
        language: null,
        units: deviceUnitSystem(),
        minElevation: DEFAULT_MIN_ELEVATION,
        notificationsEnabled: true,
        motionPreference: 'system',
        hapticsEnabled: true,
        demoMode: false,
        customLocation: null,
      });
    });
  });

  describe('given the default settings', () => {
    describe.each([
      { field: 'language', value: 'en', change: (s: SettingsStore) => s.setLanguage('en') },
      { field: 'units', value: 'imperial', change: (s: SettingsStore) => s.setUnits('imperial') },
      {
        field: 'notificationsEnabled',
        value: false,
        change: (s: SettingsStore) => s.setNotificationsEnabled(false),
      },
      {
        field: 'motionPreference',
        value: 'reduce',
        change: (s: SettingsStore) => s.setMotionPreference('reduce'),
      },
      {
        field: 'hapticsEnabled',
        value: false,
        change: (s: SettingsStore) => s.setHapticsEnabled(false),
      },
      { field: 'demoMode', value: true, change: (s: SettingsStore) => s.setDemoMode(true) },
    ])('when the user sets $field to $value', ({ field, value, change }) => {
      beforeEach(() => {
        change(useSettingsStore.getState());
      });

      test(`then ${field} is ${String(value)}`, () => {
        expect(useSettingsStore.getState()).toMatchObject({ [field]: value });
      });
    });

    describe.each([
      { input: 25.4, expected: 25 },
      { input: -5, expected: MIN_ELEVATION_LIMITS.min },
      { input: 90, expected: MIN_ELEVATION_LIMITS.max },
    ])('when the user sets a minimum elevation of $input', ({ input, expected }) => {
      beforeEach(() => {
        useSettingsStore.getState().setMinElevation(input);
      });

      test(`then it is clamped to ${expected}`, () => {
        expect(useSettingsStore.getState().minElevation).toBe(expected);
      });
    });

    describe('when the units are set to imperial', () => {
      beforeEach(() => {
        useSettingsStore.getState().setUnits('imperial');
      });

      test('then it saves only the settings, not the actions, to MMKV', () => {
        expect(persisted()).toEqual({
          version: 2,
          state: {
            language: null,
            units: 'imperial',
            minElevation: DEFAULT_MIN_ELEVATION,
            notificationsEnabled: true,
            motionPreference: 'system',
            hapticsEnabled: true,
            demoMode: false,
            customLocation: null,
            lastLocation: null,
            onboardingComplete: false,
          },
        });
      });
    });

    describe('when the user’s location is remembered', () => {
      beforeEach(() => {
        useSettingsStore
          .getState()
          .rememberLocation({ latitude: 51.507218, longitude: -0.127586, altitude: 0.0114 });
      });

      test('then it is rounded to about a kilometre', () => {
        expect(useSettingsStore.getState().lastLocation).toEqual({
          latitude: 51.51,
          longitude: -0.13,
          altitude: 0,
        });
      });
    });

    describe('when the user picks a city', () => {
      beforeEach(() => {
        useSettingsStore.getState().setCustomLocation(REYKJAVIK);
      });

      test('then the city is saved', () => {
        expect(persisted().state.customLocation).toEqual(REYKJAVIK);
      });
    });
  });

  describe('given the user has picked a city', () => {
    beforeEach(() => {
      useSettingsStore.getState().setCustomLocation(REYKJAVIK);
    });

    describe('when the user chooses GPS again', () => {
      beforeEach(() => {
        useSettingsStore.getState().setCustomLocation(null);
      });

      test('then there is no chosen city', () => {
        expect(useSettingsStore.getState().customLocation).toBeNull();
      });
    });
  });

  describe('given the language follows the device', () => {
    let changeLanguage: jest.SpyInstance;

    beforeEach(() => {
      useSettingsStore.setState({ language: null });
      changeLanguage = jest.spyOn(i18n, 'changeLanguage');
    });

    afterEach(() => {
      changeLanguage.mockRestore();
    });

    describe('when the user picks English', () => {
      beforeEach(() => {
        useSettingsStore.getState().setLanguage('en');
      });

      test('then i18next switches to English', () => {
        expect(changeLanguage.mock.calls.map(([language]) => language)).toEqual(['en']);
      });
    });
  });

  describe('given the user has picked English', () => {
    let changeLanguage: jest.SpyInstance;

    beforeEach(() => {
      useSettingsStore.getState().setLanguage('en');
      changeLanguage = jest.spyOn(i18n, 'changeLanguage');
    });

    afterEach(() => {
      changeLanguage.mockRestore();
    });

    describe('when the language is set back to follow the device', () => {
      beforeEach(() => {
        useSettingsStore.getState().setLanguage(null);
      });

      test('then i18next switches to the device’s language', () => {
        expect(changeLanguage.mock.calls.map(([language]) => language)).toEqual(['en']);
      });
    });
  });

  describe('given saved version 1 settings with imperial units and a 30° minimum', () => {
    beforeEach(() => {
      saveVersion1Settings({ units: 'imperial', minElevation: 30 });
    });

    describe('when the store rehydrates', () => {
      beforeEach(async () => {
        await useSettingsStore.persist.rehydrate();
      });

      test('then it restores the saved settings', () => {
        expect(useSettingsStore.getState()).toMatchObject({ units: 'imperial', minElevation: 30 });
      });

      test('then it keeps its actions', () => {
        expect(typeof useSettingsStore.getState().setUnits).toBe('function');
      });
    });
  });

  describe('given an install from before onboarding that already has a location', () => {
    beforeEach(() => {
      saveVersion1Settings({ lastLocation: { latitude: 1, longitude: 2, altitude: 0 } });
    });

    describe('when the store rehydrates after the upgrade', () => {
      beforeEach(async () => {
        await useSettingsStore.persist.rehydrate();
      });

      test('then onboarding is skipped', () => {
        expect(useSettingsStore.getState().onboardingComplete).toBe(true);
      });
    });
  });
});

describe('unitSystemFor', () => {
  describe('given the device’s measurement system', () => {
    test.each([
      { measurementSystem: 'us', units: 'imperial' },
      { measurementSystem: 'uk', units: 'metric' },
      { measurementSystem: 'metric', units: 'metric' },
      { measurementSystem: null, units: 'metric' },
    ] as const)(
      'then a $measurementSystem device defaults to $units units',
      ({ measurementSystem, units }) => {
        expect(unitSystemFor(measurementSystem)).toBe(units);
      },
    );
  });
});

describe('migrateSettings', () => {
  describe('given version 1 settings without a location', () => {
    test('then the user still sees onboarding after the upgrade', () => {
      expect(migrateSettings({ units: 'metric' }, 1)).toEqual({
        units: 'metric',
        onboardingComplete: false,
      });
    });
  });

  describe('given version 2 settings', () => {
    test('then they are kept as they are', () => {
      expect(migrateSettings({ onboardingComplete: true }, 2)).toEqual({
        onboardingComplete: true,
      });
    });
  });
});

describe('needsOnboarding', () => {
  describe('given onboarding isn’t finished and the app isn’t in demo mode', () => {
    test('then onboarding shows', () => {
      expect(needsOnboarding(false, false)).toBe(true);
    });
  });

  describe('given onboarding is finished', () => {
    test('then onboarding doesn’t show', () => {
      expect(needsOnboarding(true, false)).toBe(false);
    });
  });

  describe('given the app is in demo mode', () => {
    test('then onboarding doesn’t show', () => {
      expect(needsOnboarding(false, true)).toBe(false);
    });
  });
});
