import { Canvas, Line, matchFont, Rect, Text, vec } from '@shopify/react-native-skia';
import { Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withDecay,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '@/ui/theme';

import {
  formatClock,
  formatOffset,
  MS_PER_POINT,
  offsetAfterDrag,
  TIMELINE_SPAN,
  type ClockStyle,
} from './timeline';

const HEIGHT = 56;
const TRACK_Y = 44;
const HOUR = 60 * 60 * 1_000;

const font = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 17,
  fontWeight: '600',
});

type TimelineScrubberProps = {
  width: number;
  base: SharedValue<number>;
  offset: SharedValue<number>;
  clockStyle: ClockStyle;
  onCommit(offset: number): void;
};

export function TimelineScrubber({
  width,
  base,
  offset,
  clockStyle,
  onCommit,
}: TimelineScrubberProps) {
  const offsetAtStart = useSharedValue(0);

  const label = useDerivedValue(() => {
    const extra = formatOffset(offset.get());
    const clock = formatClock(base.get() + offset.get(), clockStyle);
    return extra ? `${clock}  ${extra}` : clock;
  });
  const progress = useDerivedValue(() => (offset.get() / TIMELINE_SPAN) * width);
  const ticks = useDerivedValue(() => {
    const start = base.get();
    const firstHour = Math.ceil(start / HOUR) * HOUR;
    const xs: number[] = [];
    for (let hour = firstHour; hour <= start + TIMELINE_SPAN; hour += HOUR) {
      xs.push(((hour - start) / TIMELINE_SPAN) * width);
    }
    return xs;
  });

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onStart(() => {
      cancelAnimation(offset);
      offsetAtStart.set(offset.get());
    })
    .onUpdate((event) => {
      offset.set(offsetAfterDrag(offsetAtStart.get(), event.translationX));
    })
    .onEnd((event) => {
      offset.set(
        withDecay({ velocity: event.velocityX * MS_PER_POINT, clamp: [0, TIMELINE_SPAN] }, () => {
          runOnJS(onCommit)(offset.get());
        }),
      );
    });

  return (
    <GestureDetector gesture={pan}>
      <Canvas
        style={{ width, height: HEIGHT }}
        accessibilityRole="adjustable"
        accessibilityLabel="Timeline">
        <Text x={0} y={20} text={label} font={font} color={colors.text} />
        <Rect x={0} y={TRACK_Y - 2} width={width} height={4} color={colors.border} />
        <Rect x={0} y={TRACK_Y - 2} width={progress} height={4} color={colors.accent} />
        <TickMarks ticks={ticks} />
      </Canvas>
    </GestureDetector>
  );
}

function TickMarks({ ticks }: { ticks: SharedValue<number[]> }) {
  return (
    <>
      {Array.from({ length: 13 }, (_, index) => (
        <Tick key={index} index={index} ticks={ticks} />
      ))}
    </>
  );
}

function Tick({ index, ticks }: { index: number; ticks: SharedValue<number[]> }) {
  const start = useDerivedValue(() => vec(ticks.get()[index] ?? -10, TRACK_Y - 8));
  const end = useDerivedValue(() => vec(ticks.get()[index] ?? -10, TRACK_Y + 8));
  return <Line p1={start} p2={end} color={colors.textMuted} strokeWidth={1} />;
}
