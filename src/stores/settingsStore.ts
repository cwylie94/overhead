import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Observer } from '@/domain/observer';
import type { UnitSystem } from '@/domain/types';
import type { Language } from '@/i18n/resources';

import { persistStorage } from './storage';

export const MOTION_PREFERENCES = ['system', 'reduce', 'full'] as const;
export type MotionPreference = (typeof MOTION_PREFERENCES)[number];

export type CustomLocation = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
};

export const MIN_ELEVATION_LIMITS = { min: 0, max: 60 } as const;
export const DEFAULT_MIN_ELEVATION = 10;

export type SettingsState = {
  language: Language | null;
  units: UnitSystem;
  minElevation: number;
  notificationsEnabled: boolean;
  motionPreference: MotionPreference;
  hapticsEnabled: boolean;
  demoMode: boolean;
  customLocation: CustomLocation | null;
  lastLocation: Observer | null;
  onboardingComplete: boolean;
};

type SettingsActions = {
  setLanguage(language: Language | null): void;
  setUnits(units: UnitSystem): void;
  setMinElevation(degrees: number): void;
  setNotificationsEnabled(enabled: boolean): void;
  setMotionPreference(preference: MotionPreference): void;
  setHapticsEnabled(enabled: boolean): void;
  setDemoMode(enabled: boolean): void;
  setCustomLocation(location: CustomLocation | null): void;
  rememberLocation(location: Observer): void;
  setOnboardingComplete(complete: boolean): void;
};

const LOCATION_DECIMALS = 2;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function coarseLocation({ latitude, longitude, altitude }: Observer): Observer {
  return {
    latitude: roundTo(latitude, LOCATION_DECIMALS),
    longitude: roundTo(longitude, LOCATION_DECIMALS),
    altitude: roundTo(altitude, 1),
  };
}

export function unitSystemFor(measurementSystem: string | null | undefined): UnitSystem {
  return measurementSystem === 'us' ? 'imperial' : 'metric';
}

export function deviceUnitSystem(): UnitSystem {
  return unitSystemFor(getLocales()[0]?.measurementSystem);
}

function clampElevation(degrees: number): number {
  const rounded = Math.round(degrees);
  return Math.min(MIN_ELEVATION_LIMITS.max, Math.max(MIN_ELEVATION_LIMITS.min, rounded));
}

type PersistedSettings = Partial<SettingsState>;

export function migrateSettings(persisted: unknown, version: number): PersistedSettings {
  const settings = (persisted ?? {}) as PersistedSettings;
  if (version < 2) {
    const hasUsedApp = settings.lastLocation != null || settings.customLocation != null;
    return { ...settings, onboardingComplete: hasUsedApp };
  }
  return settings;
}

export function needsOnboarding(onboardingComplete: boolean, inDemo: boolean): boolean {
  return !onboardingComplete && !inDemo;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      language: null,
      units: deviceUnitSystem(),
      minElevation: DEFAULT_MIN_ELEVATION,
      notificationsEnabled: true,
      motionPreference: 'system',
      hapticsEnabled: true,
      demoMode: false,
      customLocation: null,
      lastLocation: null,
      onboardingComplete: false,

      setLanguage: (language) => set({ language }),
      setUnits: (units) => set({ units }),
      setMinElevation: (degrees) => set({ minElevation: clampElevation(degrees) }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setMotionPreference: (motionPreference) => set({ motionPreference }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setDemoMode: (demoMode) => set({ demoMode }),
      setCustomLocation: (customLocation) => set({ customLocation }),
      rememberLocation: (location) => set({ lastLocation: coarseLocation(location) }),
      setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
    }),
    {
      name: 'settings',
      version: 2,
      storage: persistStorage,
      migrate: (persisted, version) => migrateSettings(persisted, version),
      partialize: ({
        language,
        units,
        minElevation,
        notificationsEnabled,
        motionPreference,
        hapticsEnabled,
        demoMode,
        customLocation,
        lastLocation,
        onboardingComplete,
      }) => ({
        language,
        units,
        minElevation,
        notificationsEnabled,
        motionPreference,
        hapticsEnabled,
        demoMode,
        customLocation,
        lastLocation,
        onboardingComplete,
      }),
    },
  ),
);
