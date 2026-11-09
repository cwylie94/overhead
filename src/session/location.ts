import { useMemo } from 'react';

import type { Observer } from '@/domain/observer';
import { useSettingsStore, type CustomLocation } from '@/stores/settingsStore';

import { useAppSession, type DemoEnvironment } from './appSession';

export function fixedObserver(
  demo: DemoEnvironment | null,
  chosen: CustomLocation | null,
): Observer | null {
  if (demo) {
    return demo.observer;
  }
  return chosen ? { latitude: chosen.latitude, longitude: chosen.longitude, altitude: 0 } : null;
}

export function useChosenLocation(): CustomLocation | null {
  const { features } = useAppSession();
  const customLocation = useSettingsStore((settings) => settings.customLocation);
  return features.chosenLocation ? customLocation : null;
}

export function useFixedObserver(): Observer | null {
  const { demo } = useAppSession();
  const chosen = useChosenLocation();
  return useMemo(() => fixedObserver(demo, chosen), [demo, chosen]);
}
