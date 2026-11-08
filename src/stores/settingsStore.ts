import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { UnitSystem } from '@/domain/types';
import type { Language } from '@/i18n/resources';

import { persistStorage } from './storage';

export const MOTION_PREFERENCES = ['system', 'reduce', 'full'] as const;
export type MotionPreference = (typeof MOTION_PREFERENCES)[number];

export const MIN_ELEVATION_LIMITS = { min: 0, max: 60 } as const;
export const DEFAULT_MIN_ELEVATION = 10;

export type SettingsState = {
  language: Language | null;
  units: UnitSystem;
  minElevation: number;
  notificationsEnabled: boolean;
  motionPreference: MotionPreference;
};

type SettingsActions = {
  setLanguage(language: Language | null): void;
  setUnits(units: UnitSystem): void;
  setMinElevation(degrees: number): void;
  setNotificationsEnabled(enabled: boolean): void;
  setMotionPreference(preference: MotionPreference): void;
};

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

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      language: null,
      units: deviceUnitSystem(),
      minElevation: DEFAULT_MIN_ELEVATION,
      notificationsEnabled: true,
      motionPreference: 'system',

      setLanguage: (language) => set({ language }),
      setUnits: (units) => set({ units }),
      setMinElevation: (degrees) => set({ minElevation: clampElevation(degrees) }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setMotionPreference: (motionPreference) => set({ motionPreference }),
    }),
    {
      name: 'settings',
      version: 1,
      storage: persistStorage,
      partialize: ({ language, units, minElevation, notificationsEnabled, motionPreference }) => ({
        language,
        units,
        minElevation,
        notificationsEnabled,
        motionPreference,
      }),
    },
  ),
);
