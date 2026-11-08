import i18n from '@/i18n';

import {
  DEFAULT_MIN_ELEVATION,
  deviceUnitSystem,
  MIN_ELEVATION_LIMITS,
  unitSystemFor,
  useSettingsStore,
} from '../settingsStore';
import { storeStorage } from '../storage';

function persisted() {
  return JSON.parse(storeStorage.getString('settings') ?? 'null');
}

beforeEach(() => {
  storeStorage.clearAll();
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

describe('settings store', () => {
  test('starts with sensible defaults', () => {
    expect(useSettingsStore.getState()).toMatchObject({
      language: null,
      units: deviceUnitSystem(),
      minElevation: DEFAULT_MIN_ELEVATION,
      notificationsEnabled: true,
      motionPreference: 'system',
    });
  });

  test.each([
    ['us', 'imperial'],
    ['uk', 'metric'],
    ['metric', 'metric'],
    [null, 'metric'],
  ] as const)('a %s device defaults to %s units', (measurementSystem, expected) => {
    expect(unitSystemFor(measurementSystem)).toBe(expected);
  });

  test('each setter updates its own field', () => {
    const store = useSettingsStore.getState();

    store.setLanguage('en');
    store.setUnits('imperial');
    store.setNotificationsEnabled(false);
    store.setMotionPreference('reduce');

    expect(useSettingsStore.getState()).toMatchObject({
      language: 'en',
      units: 'imperial',
      notificationsEnabled: false,
      motionPreference: 'reduce',
    });
  });

  test.each([
    [25.4, 25],
    [-5, MIN_ELEVATION_LIMITS.min],
    [90, MIN_ELEVATION_LIMITS.max],
  ])('clamps a minimum elevation of %d to %d', (input, expected) => {
    useSettingsStore.getState().setMinElevation(input);

    expect(useSettingsStore.getState().minElevation).toBe(expected);
  });

  test('saves only the settings, not the actions, to MMKV', () => {
    useSettingsStore.getState().setUnits('imperial');

    expect(persisted()).toEqual({
      version: 1,
      state: {
        language: null,
        units: 'imperial',
        minElevation: DEFAULT_MIN_ELEVATION,
        notificationsEnabled: true,
        motionPreference: 'system',
      },
    });
  });

  test('restores saved settings on rehydrate', async () => {
    storeStorage.set(
      'settings',
      JSON.stringify({ version: 1, state: { units: 'imperial', minElevation: 30 } }),
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState()).toMatchObject({ units: 'imperial', minElevation: 30 });
    expect(typeof useSettingsStore.getState().setUnits).toBe('function');
  });

  test('changing the language switches i18next, and null follows the device', () => {
    const changeLanguage = jest.spyOn(i18n, 'changeLanguage');

    useSettingsStore.getState().setLanguage('en');
    useSettingsStore.getState().setLanguage(null);

    expect(changeLanguage.mock.calls.map(([language]) => language)).toEqual(['en', 'en']);
    changeLanguage.mockRestore();
  });
});
