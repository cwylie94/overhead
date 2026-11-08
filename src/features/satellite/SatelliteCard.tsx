import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/ui/theme';

const MAX_TILT = 15;
const POINTS_PER_DEGREE = 8;
const FLIP_MS = 450;

type SatelliteCardProps = {
  accent: string;
  front: ReactNode;
  back: ReactNode;
};

export function SatelliteCard({ accent, front, back }: SatelliteCardProps) {
  const reduceMotion = useReducedMotion();
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const flip = useSharedValue(0);

  const clamp = (value: number) => {
    'worklet';
    return Math.max(-MAX_TILT, Math.min(MAX_TILT, value));
  };

  const tilt = Gesture.Pan()
    .enabled(!reduceMotion)
    .onUpdate((event) => {
      tiltY.set(clamp(event.translationX / POINTS_PER_DEGREE));
      tiltX.set(clamp(-event.translationY / POINTS_PER_DEGREE));
    })
    .onFinalize(() => {
      tiltX.set(withSpring(0));
      tiltY.set(withSpring(0));
    });

  const turn = Gesture.Tap().onEnd(() => {
    const target = flip.get() >= 0.5 ? 0 : 1;
    flip.set(reduceMotion ? target : withTiming(target, { duration: FLIP_MS }));
  });

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: `${tiltX.get()}deg` },
      { rotateY: `${tiltY.get() + flip.get() * 180}deg` },
    ],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: `${tiltX.get()}deg` },
      { rotateY: `${tiltY.get() + flip.get() * 180 + 180}deg` },
    ],
  }));
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: 0.05 + (Math.abs(tiltX.get()) + Math.abs(tiltY.get())) / (MAX_TILT * 8),
    transform: [{ translateX: tiltY.get() * 10 - tiltX.get() * 4 }, { rotate: '25deg' }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(tilt, turn)}>
      <View style={styles.container}>
        <Animated.View style={[styles.face, { borderColor: accent }, frontStyle]}>
          {front}
          <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]} />
        </Animated.View>
        <Animated.View style={[styles.face, styles.back, { borderColor: accent }, backStyle]}>
          {back}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 0.68,
  },
  face: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md * 1.5,
    borderWidth: 2,
    padding: spacing.lg,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  back: {
    backgroundColor: colors.surface,
  },
  sheen: {
    position: 'absolute',
    top: -100,
    bottom: -100,
    left: '35%',
    width: '30%',
    backgroundColor: '#FFFFFF',
  },
});
