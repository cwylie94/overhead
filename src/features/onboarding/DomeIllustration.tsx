import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { brightnessMarkColors, colors, typography } from '@/ui/theme';

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 4;
const TURN_MS = 180_000;

function arc(from: [number, number], via: [number, number], to: [number, number]) {
  return Skia.PathBuilder.Make()
    .moveTo(...from)
    .quadTo(...via, ...to)
    .build();
}

const brightPath = arc([30, 150], [90, 10], [178, 76]);
const brilliantPath = arc([36, 58], [110, 120], [168, 150]);
const faintDots: [number, number][] = [
  [62, 128],
  [150, 120],
  [78, 54],
  [124, 166],
];

export function DomeIllustration() {
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.set(withRepeat(withTiming(360, { duration: TURN_MS, easing: Easing.linear }), -1));
  }, [turn]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));

  return (
    <View style={styles.container} accessibilityElementsHidden importantForAccessibility="no">
      <Text style={styles.north}>N</Text>
      <View style={styles.dome}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} color={colors.surface} />
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            color={colors.textMuted}
            style="stroke"
            strokeWidth={1}
          />
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={(RADIUS * 2) / 3}
            color={colors.border}
            style="stroke"
            strokeWidth={1}
          />
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS / 3}
            color={colors.border}
            style="stroke"
            strokeWidth={1}
          />
        </Canvas>
        <Animated.View style={[StyleSheet.absoluteFill, spin]}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Path
              path={brightPath}
              color={brightnessMarkColors.bright}
              style="stroke"
              strokeWidth={1.5}
              opacity={0.55}
            />
            <Circle cx={128} cy={44} r={5} color={brightnessMarkColors.bright} />
            <Path
              path={brilliantPath}
              color={brightnessMarkColors.brilliant}
              style="stroke"
              strokeWidth={1.5}
              opacity={0.4}
            />
            <Circle cx={96} cy={102} r={4} color={brightnessMarkColors.brilliant} />
            {faintDots.map(([x, y]) => (
              <Circle key={`${x}-${y}`} cx={x} cy={y} r={2} color={brightnessMarkColors.faint} />
            ))}
          </Canvas>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  north: {
    ...typography.label,
    color: colors.accent,
    marginBottom: 4,
  },
  dome: {
    width: SIZE,
    height: SIZE,
  },
});
