import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { haptics } from '@/ui/haptics';
import { spacing } from '@/ui/theme';

import { Loupe, LOUPE_MAX_WIDTH, LoupeBracket, type ScrubLabel, type ScrubPass } from './Loupe';
import { axisScale, timeAtX, type TimelineAxis } from './timelineLayout';
import { LOUPE_SPAN, loupeLeft, nearestStart } from './timelineScrub';

const ACTIVATE_AFTER = 8;
const VERTICAL_ESCAPE = 14;

export type { ScrubLabel, ScrubPass } from './Loupe';

type TimelineScrubberProps = {
  width: number;
  trackHeight: number;
  axis: TimelineAxis;
  passes: ScrubPass[];
  labels: ScrubLabel[];
  onSelect(id: number): void;
  children: ReactNode;
};

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
        <LoupeBracket width={bracketWidth} height={trackHeight} style={bracketStyle} />
        <Loupe
          passes={passes}
          labels={labels}
          center={center}
          selected={selected}
          loupeWidth={loupeWidth}
          caption={pass ? `${pass.name} · ${pass.time}` : t('timeline.noPass')}
          style={[{ bottom: trackHeight + spacing.sm }, loupeStyle]}
        />
      </View>
    </GestureDetector>
  );
}
