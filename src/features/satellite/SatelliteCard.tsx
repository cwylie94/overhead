import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Rarity } from '@/domain/types';
import { HoloStripes } from '@/ui/CardFinish';
import { useReduceMotion } from '@/ui/motion';
import { colors, radius, rarityColors, spacing } from '@/ui/theme';

const MAX_TILT = 15;
const POINTS_PER_DEGREE = 8;
const FLIP_MS = 450;
const CARD_ASPECT = 0.68;

const SHEEN_BASE: Readonly<Record<Rarity, number>> = {
  common: 0.05,
  uncommon: 0.05,
  rare: 0.22,
  legendary: 0.1,
};

type SatelliteCardProps = {
  accent: string;
  rarity: Rarity;
  front: ReactNode;
  back: ReactNode;
};

export function SatelliteCard({ accent, rarity, front, back }: SatelliteCardProps) {
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
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
    opacity: SHEEN_BASE[rarity] + (Math.abs(tiltX.get()) + Math.abs(tiltY.get())) / (MAX_TILT * 8),
    transform: [{ translateX: tiltY.get() * 10 - tiltX.get() * 4 }, { rotate: '25deg' }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(tilt, turn)}>
      <View style={styles.container} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <Animated.View
          style={[
            styles.face,
            { borderColor: accent, minHeight: width / CARD_ASPECT },
            frontStyle,
          ]}>
          {front}
          <Animated.View
            pointerEvents="none"
            style={[
              rarity === 'rare' ? styles.holo : styles.sheen,
              rarity === 'legendary' && { backgroundColor: rarityColors.legendary },
              sheenStyle,
            ]}>
            {rarity === 'rare' && <HoloStripes alpha="99" />}
          </Animated.View>
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
  },
  face: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md * 1.5,
    borderWidth: 2,
    padding: spacing.lg,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  back: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface,
  },
  holo: {
    ...StyleSheet.absoluteFill,
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
