import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { Rarity } from '@/domain/types';

import { colors, rarityColors } from './theme';

const SHIMMER_MS = 2_400;
const SHIMMER_PAUSE_MS = 2_000;
const STRIPE_ALPHA = '38';
const GOLD_ALPHA = '59';

export const HOLO_COLORS = [rarityColors.rare, colors.accent, colors.success] as const;

export function HoloStripes({ alpha = STRIPE_ALPHA }: { alpha?: string }) {
  return (
    <View style={styles.stripes}>
      {HOLO_COLORS.map((color) => (
        <View key={color} style={[styles.stripe, { backgroundColor: `${color}${alpha}` }]} />
      ))}
    </View>
  );
}

function GoldShimmer() {
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.set(
      withRepeat(
        withDelay(
          SHIMMER_PAUSE_MS,
          withTiming(1, { duration: SHIMMER_MS, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [sweep]);

  const style = useAnimatedStyle(() => ({ left: `${-60 + sweep.get() * 160}%` }));

  return (
    <Animated.View
      style={[styles.gold, { backgroundColor: `${rarityColors.legendary}${GOLD_ALPHA}` }, style]}
    />
  );
}

export function CardFinish({ rarity }: { rarity: Rarity }) {
  if (rarity !== 'rare' && rarity !== 'legendary') {
    return null;
  }
  return (
    <View pointerEvents="none" style={styles.layer}>
      {rarity === 'rare' ? <HoloStripes /> : <GoldShimmer />}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  stripes: {
    position: 'absolute',
    top: '-40%',
    bottom: '-40%',
    left: '18%',
    width: '54%',
    flexDirection: 'row',
    transform: [{ rotate: '25deg' }],
  },
  stripe: {
    flex: 1,
  },
  gold: {
    position: 'absolute',
    top: '-40%',
    bottom: '-40%',
    width: '28%',
    transform: [{ rotate: '25deg' }],
  },
});
