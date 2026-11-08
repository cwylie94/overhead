import { Canvas, Circle, Group, Line, Path, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { CATCH_TOLERANCE_DEGREES } from '@/domain/catchMachine';
import { positionOnTrack } from '@/domain/sky';
import type { TrackPoint } from '@/domain/types';
import { colors } from '@/ui/theme';

import { guideAngle, offsetToTarget } from './pointing';

export const POINTS_PER_DEGREE = 6;
const TARGET_RADIUS = 9;
const EDGE_INSET = 18;
const WAITING_OPACITY = 0.45;

type CatchCanvasProps = {
  size: number;
  track: TrackPoint[];
  startAt: number;
  time: SharedValue<number>;
  azimuth: SharedValue<number>;
  elevation: SharedValue<number>;
  progress: SharedValue<number>;
};

export function CatchCanvas({
  size,
  track,
  startAt,
  time,
  azimuth,
  elevation,
  progress,
}: CatchCanvasProps) {
  const center = size / 2;
  const edge = center - EDGE_INSET;
  const toleranceRadius = CATCH_TOLERANCE_DEGREES * POINTS_PER_DEGREE;

  const target = useDerivedValue(() => {
    const position = positionOnTrack(track, Math.max(time.get(), startAt));
    if (!position) {
      return null;
    }
    const offset = offsetToTarget({ azimuth: azimuth.get(), elevation: elevation.get() }, position);
    const x = offset.right * POINTS_PER_DEGREE;
    const y = -offset.up * POINTS_PER_DEGREE;
    const distance = Math.hypot(x, y);
    const scale = distance > edge ? edge / distance : 1;
    return {
      x: center + x * scale,
      y: center + y * scale,
      offscreen: scale < 1,
      angle: guideAngle(offset),
    };
  });

  const targetX = useDerivedValue(() => target.get()?.x ?? -100);
  const targetY = useDerivedValue(() => target.get()?.y ?? -100);
  const targetOpacity = useDerivedValue(() => {
    const value = target.get();
    if (!value || value.offscreen) {
      return 0;
    }
    return time.get() < startAt ? WAITING_OPACITY : 1;
  });

  const arrow = useDerivedValue(() => {
    const value = target.get();
    const builder = Skia.PathBuilder.Make();
    if (!value || !value.offscreen) {
      return builder.build();
    }
    const angle = (value.angle * Math.PI) / 180;
    const along = { x: Math.sin(angle), y: -Math.cos(angle) };
    const across = { x: -along.y, y: along.x };
    const tip = { x: value.x + along.x * 10, y: value.y + along.y * 10 };
    builder.moveTo(tip.x, tip.y);
    builder.lineTo(value.x - along.x * 8 + across.x * 9, value.y - along.y * 8 + across.y * 9);
    builder.lineTo(value.x - along.x * 8 - across.x * 9, value.y - along.y * 8 - across.y * 9);
    builder.close();
    return builder.build();
  });

  const ring = Skia.PathBuilder.Make()
    .addCircle(center, center, toleranceRadius + 10)
    .build();

  return (
    <Canvas style={{ width: size, height: size }} accessibilityLabel="Catch view">
      <Circle
        cx={center}
        cy={center}
        r={edge}
        color={colors.border}
        style="stroke"
        strokeWidth={1}
      />
      <Circle
        cx={center}
        cy={center}
        r={toleranceRadius}
        color={colors.textMuted}
        style="stroke"
        strokeWidth={1}
        opacity={0.5}
      />
      <Line
        p1={vec(center - 24, center)}
        p2={vec(center + 24, center)}
        color={colors.text}
        strokeWidth={1.5}
      />
      <Line
        p1={vec(center, center - 24)}
        p2={vec(center, center + 24)}
        color={colors.text}
        strokeWidth={1.5}
      />
      <Path
        path={ring}
        color={colors.accent}
        style="stroke"
        strokeWidth={4}
        start={0}
        end={progress}
      />
      <Group opacity={targetOpacity}>
        <Circle cx={targetX} cy={targetY} r={TARGET_RADIUS} color={colors.accent} />
      </Group>
      <Path path={arrow} color={colors.accent} />
    </Canvas>
  );
}
