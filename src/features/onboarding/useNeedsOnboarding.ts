import { useSessionFeatures } from '@/session/appSession';
import { needsOnboarding, useSettingsStore } from '@/stores/settingsStore';

export function useNeedsOnboarding(): boolean {
  const { onboarding } = useSessionFeatures();
  const onboardingComplete = useSettingsStore((settings) => settings.onboardingComplete);
  return needsOnboarding(onboardingComplete, onboarding);
}
