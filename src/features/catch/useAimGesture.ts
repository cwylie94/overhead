import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

import { POINTS_PER_DEGREE } from './CatchCanvas';
import { manualPointing } from './pointing';
import type { Pointing } from './usePointing';

export type AimGesture = ReturnType<typeof Gesture.Pan>;

export function useAimGesture(
  pointing: Pointing,
  setTouching: (touching: boolean) => void,
): AimGesture {
  const dragStart = useSharedValue({ azimuth: 0, elevation: 0 });
  const manual = pointing.mode === 'manual';
  const { azimuth, elevation, setManual } = pointing;

  return Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      dragStart.set({ azimuth: azimuth.get(), elevation: elevation.get() });
      runOnJS(setTouching)(true);
    })
    .onUpdate((event) => {
      if (!manual) {
        return;
      }
      const position = manualPointing(
        dragStart.get(),
        event.translationX,
        event.translationY,
        POINTS_PER_DEGREE,
      );
      azimuth.set(position.azimuth);
      elevation.set(position.elevation);
      runOnJS(setManual)(position);
    })
    .onFinalize(() => {
      runOnJS(setTouching)(false);
    });
}
