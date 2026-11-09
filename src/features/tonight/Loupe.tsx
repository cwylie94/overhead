import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { MAX_FONT_SCALE, Text } from '@/ui/Text';
import { colors, radius, spacing, typography } from '@/ui/theme';

import { loupeX } from './timelineScrub';

export const LOUPE_MAX_WIDTH = 260;
export const LOUPE_HEIGHT = 78;
const STRIP_HEIGHT = 30;
const SELECTED_HEIGHT = 28;
const LABEL_WIDTH = 56;
const BRACKET_FILL_ALPHA = '1F';

type AnimatedViewStyle = ComponentProps<typeof Animated.View>['style'];

export type ScrubPass = {
  id: number;
  startAt: number;
  name: string;
  time: string;
  color: string;
  height: number;
};

export type ScrubLabel = { time: number; text: string };

type Placement = {
  center: SharedValue<number>;
  loupeWidth: number;
};

function LoupeTick({
  pass,
  index,
  center,
  selected,
  loupeWidth,
}: Placement & { pass: ScrubPass; index: number; selected: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const isSelected = selected.get() === index;
    const x = loupeX(pass.startAt, center.get(), loupeWidth);
    const height = isSelected ? SELECTED_HEIGHT : pass.height;
    const width = isSelected ? 4 : 2;
    return {
      left: x - width / 2,
      width,
      height,
      top: (STRIP_HEIGHT - height) / 2,
      opacity: x < -width || x > loupeWidth + width ? 0 : 1,
      backgroundColor: isSelected ? colors.text : pass.color,
    };
  });
  return <Animated.View style={[styles.tick, style]} />;
}

function LoupeLabel({ label, center, loupeWidth }: Placement & { label: ScrubLabel }) {
  const style = useAnimatedStyle(() => {
    const x = loupeX(label.time, center.get(), loupeWidth);
    return { left: x - LABEL_WIDTH / 2, opacity: x < 0 || x > loupeWidth ? 0 : 1 };
  });
  return (
    <Animated.Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.label, style]}>
      {label.text}
    </Animated.Text>
  );
}

type LoupeProps = Placement & {
  passes: ScrubPass[];
  labels: ScrubLabel[];
  selected: SharedValue<number>;
  caption: string;
  style: AnimatedViewStyle;
};

export function Loupe({
  passes,
  labels,
  center,
  selected,
  loupeWidth,
  caption,
  style,
}: LoupeProps) {
  return (
    <Animated.View pointerEvents="none" style={[styles.loupe, { width: loupeWidth }, style]}>
      <View style={styles.strip}>
        {passes.map((pass, index) => (
          <LoupeTick
            key={pass.id}
            pass={pass}
            index={index}
            center={center}
            selected={selected}
            loupeWidth={loupeWidth}
          />
        ))}
      </View>
      <View style={styles.labels}>
        {labels.map((label) => (
          <LoupeLabel key={label.time} label={label} center={center} loupeWidth={loupeWidth} />
        ))}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {caption}
      </Text>
    </Animated.View>
  );
}

export function LoupeBracket({
  width,
  height,
  style,
}: {
  width: number;
  height: number;
  style: AnimatedViewStyle;
}) {
  return <Animated.View pointerEvents="none" style={[styles.bracket, { width, height }, style]} />;
}

const styles = StyleSheet.create({
  bracket: {
    position: 'absolute',
    top: 0,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    backgroundColor: `${colors.accent}${BRACKET_FILL_ALPHA}`,
  },
  loupe: {
    position: 'absolute',
    height: LOUPE_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    paddingTop: spacing.xs,
  },
  strip: {
    height: STRIP_HEIGHT,
  },
  tick: {
    position: 'absolute',
    borderRadius: 1,
  },
  labels: {
    height: typography.label.lineHeight,
  },
  label: {
    ...typography.label,
    fontWeight: '400',
    color: colors.textMuted,
    position: 'absolute',
    width: LABEL_WIDTH,
    textAlign: 'center',
  },
  name: {
    ...typography.label,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
});
