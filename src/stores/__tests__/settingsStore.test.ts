import i18n from '@/i18n';

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
      hapticsEnabled: true,
      demoMode: false,
      customLocation: null,
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
    store.setHapticsEnabled(false);
    store.setDemoMode(true);

    expect(useSettingsStore.getState()).toMatchObject({
      language: 'en',
      units: 'imperial',
      notificationsEnabled: false,
      motionPreference: 'reduce',
      hapticsEnabled: false,
      demoMode: true,
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

  test('remembers the last location rounded to about a kilometre', () => {
    useSettingsStore
      .getState()
      .rememberLocation({ latitude: 51.507218, longitude: -0.127586, altitude: 0.0114 });

    expect(useSettingsStore.getState().lastLocation).toEqual({
      latitude: 51.51,
      longitude: -0.13,
      altitude: 0,
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

  test('remembers a chosen city until GPS is chosen again', () => {
    const reykjavik = {
      name: 'Reykjavík',
      country: 'Iceland',
      latitude: 64.135,
      longitude: -21.895,
    };
    useSettingsStore.getState().setCustomLocation(reykjavik);

    expect(persisted().state.customLocation).toEqual(reykjavik);

    useSettingsStore.getState().setCustomLocation(null);
    expect(useSettingsStore.getState().customLocation).toBeNull();
  });

  test('installs that already have a location skip onboarding after the upgrade', async () => {
    storeStorage.set(
      'settings',
      JSON.stringify({
        version: 1,
        state: { lastLocation: { latitude: 1, longitude: 2, altitude: 0 } },
      }),
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().onboardingComplete).toBe(true);
  });

  test('installs without a location still see onboarding after the upgrade', () => {
    expect(migrateSettings({ units: 'metric' }, 1)).toEqual({
      units: 'metric',
      onboardingComplete: false,
    });
    expect(migrateSettings({ onboardingComplete: true }, 2)).toEqual({ onboardingComplete: true });
  });

  test('onboarding shows until it is finished, and never in demo mode', () => {
    expect(needsOnboarding(false, false)).toBe(true);
    expect(needsOnboarding(true, false)).toBe(false);
    expect(needsOnboarding(false, true)).toBe(false);
  });
});
