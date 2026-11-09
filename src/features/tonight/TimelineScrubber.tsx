import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { haptics } from '@/ui/haptics';
import { colors, radius, spacing, typography } from '@/ui/theme';

import { axisScale, timeAtX, type TimelineAxis } from './timelineLayout';
import { LOUPE_SPAN, loupeLeft, loupeX, nearestStart } from './timelineScrub';

const LOUPE_MAX_WIDTH = 260;
const LOUPE_HEIGHT = 78;
const STRIP_HEIGHT = 30;
const SELECTED_HEIGHT = 28;
const ACTIVATE_AFTER = 8;
const VERTICAL_ESCAPE = 14;
const LABEL_WIDTH = 56;
const BRACKET_FILL_ALPHA = '1F';

export type ScrubPass = {
  id: number;
  startAt: number;
  name: string;
  time: string;
  color: string;
  height: number;
};

export type ScrubLabel = { time: number; text: string };

type TimelineScrubberProps = {
  width: number;
  trackHeight: number;
  axis: TimelineAxis;
  passes: ScrubPass[];
  labels: ScrubLabel[];
  onSelect(id: number): void;
  children: ReactNode;
};

type LoupeProps = {
  center: SharedValue<number>;
  selected: SharedValue<number>;
  loupeWidth: number;
};

function LoupeTick({
  pass,
  index,
  center,
  selected,
  loupeWidth,
}: LoupeProps & { pass: ScrubPass; index: number }) {
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

function LoupeLabel({
  label,
  center,
  loupeWidth,
}: Omit<LoupeProps, 'selected'> & { label: ScrubLabel }) {
  const style = useAnimatedStyle(() => {
    const x = loupeX(label.time, center.get(), loupeWidth);
    return { left: x - LABEL_WIDTH / 2, opacity: x < 0 || x > loupeWidth ? 0 : 1 };
  });
  return <Animated.Text style={[styles.label, style]}>{label.text}</Animated.Text>;
}

export function TimelineScrubber({
  width,
  trackHeight,
  axis,
  passes,
  labels,
  onSelect,
  children,
}: TimelineScrubberProps) {
  const { t } = useTranslation('tonight');
  const active = useSharedValue(false);
  const fingerX = useSharedValue(0);
  const center = useSharedValue(axis.segments[0]?.from ?? 0);
  const selected = useSharedValue(-1);
  const [chosen, setChosen] = useState<number | null>(null);
  const loupeWidth = Math.min(LOUPE_MAX_WIDTH, width);
  const bracketWidth = LOUPE_SPAN * axisScale(axis, width);
  const starts = passes.map((pass) => pass.startAt);
  const ids = passes.map((pass) => pass.id);

  const choose = (index: number) => {
    setChosen(index < 0 ? null : index);
    if (index >= 0) {
      haptics.select();
    }
  };

  const follow = (rawX: number) => {
    'worklet';
    const x = Math.min(Math.max(rawX, 0), width);
    const time = timeAtX(x, axis, width);
    fingerX.set(x);
    center.set(time);
    const index = nearestStart(starts, time, LOUPE_SPAN / 2);
    if (index !== selected.get()) {
      selected.set(index);
      runOnJS(choose)(index);
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-ACTIVATE_AFTER, ACTIVATE_AFTER])
    .failOffsetY([-VERTICAL_ESCAPE, VERTICAL_ESCAPE])
    .onStart((event) => {
      active.set(true);
      follow(event.x);
    })
    .onUpdate((event) => follow(event.x))
    .onEnd(() => {
      const index = selected.get();
      if (index >= 0) {
        runOnJS(onSelect)(ids[index]!);
      }
    })
    .onFinalize(() => {
      active.set(false);
      selected.set(-1);
      runOnJS(choose)(-1);
    });

  const loupeStyle = useAnimatedStyle(() => ({
    left: loupeLeft(fingerX.get(), width, loupeWidth),
    opacity: active.get() ? 1 : 0,
  }));
  const bracketStyle = useAnimatedStyle(() => ({
    left: fingerX.get() - bracketWidth / 2,
    opacity: active.get() ? 1 : 0,
  }));
  const pass = chosen === null ? null : passes[chosen];

  return (
    <GestureDetector gesture={pan}>
      <View>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[styles.bracket, { width: bracketWidth, height: trackHeight }, bracketStyle]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.loupe,
            { width: loupeWidth, bottom: trackHeight + spacing.sm },
            loupeStyle,
          ]}>
          <View style={styles.strip}>
            {passes.map((scrubPass, index) => (
              <LoupeTick
                key={scrubPass.id}
                pass={scrubPass}
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
            {pass ? `${pass.name} · ${pass.time}` : t('timeline.noPass')}
          </Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
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
