import { useDemo } from '@/demo/session';
import { needsOnboarding, useSettingsStore } from '@/stores/settingsStore';

export function useNeedsOnboarding(): boolean {
  const demo = useDemo();
  const onboardingComplete = useSettingsStore((settings) => settings.onboardingComplete);
  return needsOnboarding(onboardingComplete, demo !== null);
}
