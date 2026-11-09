import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  Loupe,
  LOUPE_HEIGHT,
  LOUPE_MAX_WIDTH,
  LoupeBracket,
  type ScrubPass,
} from '@/features/tonight/Loupe';
import {
  LOUPE_SPAN,
  loupeLabelTimes,
  loupeLeft,
  nearestStart,
} from '@/features/tonight/timelineScrub';
import { formatPassTime } from '@/i18n/format';
import { useReduceMotion } from '@/ui/motion';
import { brightnessMarkColors, colors, radius, spacing } from '@/ui/theme';

import {
  DEMO_PASSES,
  DEMO_SPAN,
  DEMO_START,
  demoCenter,
  demoFraction,
  progressAt,
} from './sampleNight';

const SWEEP_MS = 6_000;
const TRACK_HEIGHT = 24;
const FINGER = 22;
const TRACK_TICK = { brilliant: 16, bright: 10, faint: 6 } as const;
const LOUPE_TICK = { brilliant: 24, bright: 16, faint: 9 } as const;
const REST = progressAt(DEMO_PASSES[1]!.startAt);
const STARTS = DEMO_PASSES.map((pass) => pass.startAt);

export function LoupeDemo() {
  const { t, i18n } = useTranslation('tonight');
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [chosen, setChosen] = useState(-1);
  const progress = useSharedValue(REST);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(REST);
      return;
    }
    progress.set(
      withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(progress);
  }, [reduceMotion, progress]);

  const loupeWidth = Math.min(LOUPE_MAX_WIDTH, width);
  const bracketWidth = (LOUPE_SPAN / DEMO_SPAN) * width;
  const center = useDerivedValue(() => demoCenter(progress.get()));
  const fingerX = useDerivedValue(() => demoFraction(progress.get()) * width);
  const selected = useDerivedValue(() => nearestStart(STARTS, center.get(), LOUPE_SPAN / 2));

  useAnimatedReaction(
    () => selected.get(),
    (index, previous) => {
      if (index !== previous) {
        runOnJS(setChosen)(index);
      }
    },
  );

  const loupeStyle = useAnimatedStyle(() => ({
    left: loupeLeft(fingerX.get(), width, loupeWidth),
  }));
  const bracketStyle = useAnimatedStyle(() => ({ left: fingerX.get() - bracketWidth / 2 }));
  const fingerStyle = useAnimatedStyle(() => ({ left: fingerX.get() - FINGER / 2 }));

  const passes = DEMO_PASSES.map((pass): ScrubPass => ({
    id: pass.id,
    startAt: pass.startAt,
    name: pass.name,
    time: formatPassTime(pass.startAt, i18n.language),
    color: brightnessMarkColors[pass.tier],
    height: LOUPE_TICK[pass.tier],
  }));
  const labels = loupeLabelTimes({ from: DEMO_START, to: DEMO_START + DEMO_SPAN }).map((time) => ({
    time,
    text: formatPassTime(time, i18n.language),
  }));
  const pass = chosen >= 0 ? passes[chosen] : undefined;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.demo}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
      {width > 0 && (
        <>
          <Loupe
            passes={passes}
            labels={labels}
            center={center}
            selected={selected}
            loupeWidth={loupeWidth}
            caption={pass ? `${pass.name} · ${pass.time}` : t('timeline.noPass')}
            style={[styles.loupe, loupeStyle]}
          />
          <View style={styles.track}>
            {DEMO_PASSES.map((demoPass) => (
              <View
                key={demoPass.id}
                style={[
                  styles.tick,
                  {
                    left: `${((demoPass.startAt - DEMO_START) / DEMO_SPAN) * 100}%`,
                    height: TRACK_TICK[demoPass.tier],
                    backgroundColor: brightnessMarkColors[demoPass.tier],
                  },
                ]}
              />
            ))}
            <LoupeBracket width={bracketWidth} height={TRACK_HEIGHT} style={bracketStyle} />
            <Animated.View style={[styles.finger, fingerStyle]} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  demo: {
    marginTop: spacing.sm,
    height: LOUPE_HEIGHT + spacing.sm + TRACK_HEIGHT + FINGER / 2,
  },
  loupe: {
    top: 0,
  },
  track: {
    position: 'absolute',
    top: LOUPE_HEIGHT + spacing.sm,
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
  finger: {
    position: 'absolute',
    top: TRACK_HEIGHT / 2,
    width: FINGER,
    height: FINGER,
    borderRadius: FINGER / 2,
    backgroundColor: colors.text,
    opacity: 0.75,
    borderWidth: 2,
    borderColor: colors.background,
  },
});
