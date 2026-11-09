import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/stores/settingsStore';

function play(effect: () => Promise<void>): void {
  if (useSettingsStore.getState().hapticsEnabled) {
    effect().catch(() => {});
  }
}

export const haptics = {
  aimPulse: () => play(() => Haptics.selectionAsync()),
  select: () => play(() => Haptics.selectionAsync()),
  locked: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  caught: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  bigCatch: () =>
    play(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }),
};
