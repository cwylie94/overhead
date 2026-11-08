import type { MotionPreference } from '@/stores/settingsStore';

export function shouldReduceMotion(preference: MotionPreference, systemReduces: boolean): boolean {
  return preference === 'system' ? systemReduces : preference === 'reduce';
}
