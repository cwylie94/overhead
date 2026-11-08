import { ReducedMotionConfig, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import { useSettingsStore, type MotionPreference } from '@/stores/settingsStore';

import { shouldReduceMotion } from './motionPreference';

export const ALWAYS_ANIMATE = { reduceMotion: ReduceMotion.Never } as const;

const MODES: Readonly<Record<MotionPreference, ReduceMotion>> = {
  system: ReduceMotion.System,
  reduce: ReduceMotion.Always,
  full: ReduceMotion.Never,
};

function reduceMotionMode(preference: MotionPreference): ReduceMotion {
  return MODES[preference];
}

export function useReduceMotion(): boolean {
  const preference = useSettingsStore((settings) => settings.motionPreference);
  return shouldReduceMotion(preference, useReducedMotion());
}

export function MotionConfig() {
  const preference = useSettingsStore((settings) => settings.motionPreference);
  if (preference === 'system') {
    return null;
  }
  return <ReducedMotionConfig mode={reduceMotionMode(preference)} />;
}
