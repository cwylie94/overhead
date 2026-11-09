import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const FLIP_MS = 550;
const FILL_DELAY_MS = 500;
const FILL_MS = 700;
const BURST_MS = 1_100;
const BURST_DOTS = 14;
const BURST_REACH = 130;

export function CardReveal({ children }: { children: ReactNode }) {
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.set(withTiming(1, { duration: FLIP_MS, easing: Easing.out(Easing.back(1.4)) }));
  }, [turn]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, turn.get() * 2),
    transform: [
      { perspective: 800 },
      { rotateY: `${(1 - turn.get()) * 90}deg` },
      { scale: 0.85 + turn.get() * 0.15 },
    ],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export function ProgressFill({
  from,
  to,
  total,
  color,
}: {
  from: number;
  to: number;
  total: number;
  color: string;
}) {
  const fraction = useSharedValue(total === 0 ? 0 : from / total);

  useEffect(() => {
    fraction.set(
      withDelay(FILL_DELAY_MS, withTiming(total === 0 ? 0 : to / total, { duration: FILL_MS })),
    );
  }, [fraction, to, total]);

  const style = useAnimatedStyle(() => ({ width: `${fraction.get() * 100}%` }));

  return <Animated.View style={[styles.fill, { backgroundColor: color }, style]} />;
}

function BurstDot({
  index,
  color,
  progress,
}: {
  index: number;
  color: string;
  progress: SharedValue<number>;
}) {
  const angle = (index / BURST_DOTS) * Math.PI * 2;
  const reach = BURST_REACH * (0.7 + (index % 3) * 0.15);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [
      { translateX: Math.cos(angle) * reach * progress.get() },
      { translateY: Math.sin(angle) * reach * progress.get() },
    ],
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export function Burst({ colors }: { colors: readonly string[] }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) }));
  }, [progress]);

  return (
    <View pointerEvents="none" style={styles.burst}>
      {Array.from({ length: BURST_DOTS }, (_, index) => (
        <BurstDot
          key={index}
          index={index}
          color={colors[index % colors.length]!}
          progress={progress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  burst: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
