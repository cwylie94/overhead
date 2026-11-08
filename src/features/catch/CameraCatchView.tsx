import {
  Canvas,
  Circle,
  Group,
  Line,
  matchFont,
  Path,
  Skia,
  Text,
  vec,
} from '@shopify/react-native-skia';
import { useState } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { Camera, type CameraDevice } from 'react-native-vision-camera';

import { CATCH_TOLERANCE_DEGREES } from '@/domain/catchMachine';
import { positionOnTrack, type SkyPosition } from '@/domain/sky';
import type { TrackPoint } from '@/domain/types';
import { colors } from '@/ui/theme';

import {
  edgePoint,
  focalLengthPx,
  projectToCamera,
  trackSegments,
  type CameraPose,
} from './cameraProjection';

const DEG = Math.PI / 180;
const DEFAULT_FOCAL_LENGTH = 26;
const EDGE_INSET = 28;
const TARGET_RADIUS = 10;
const MOON_RADIUS = 18;

const font = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 13,
  fontWeight: '600',
});

type CameraCatchViewProps = {
  device: CameraDevice;
  track: TrackPoint[];
  time: SharedValue<number>;
  azimuth: SharedValue<number>;
  elevation: SharedValue<number>;
  roll: SharedValue<number>;
  progress: SharedValue<number>;
  moon: SkyPosition | null;
  moonLabel: string;
};

export function CameraCatchView(props: CameraCatchViewProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  return (
    <View
      style={styles.container}
      onLayout={({ nativeEvent }: LayoutChangeEvent) =>
        setSize({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })
      }>
      <Camera style={StyleSheet.absoluteFill} device={props.device} isActive resizeMode="cover" />
      {size && <Overlay {...props} width={size.width} height={size.height} />}
    </View>
  );
}

type OverlayProps = CameraCatchViewProps & { width: number; height: number };

function Overlay({
  device,
  track,
  time,
  azimuth,
  elevation,
  roll,
  progress,
  moon,
  moonLabel,
  width,
  height,
}: OverlayProps) {
  const focalPx = focalLengthPx(device.focalLength ?? DEFAULT_FOCAL_LENGTH, width, height);
  const viewport = { width, height, focalPx };
  const centerX = width / 2;
  const centerY = height / 2;
  const toleranceRadius = focalPx * Math.tan(CATCH_TOLERANCE_DEGREES * DEG);

  const pose = useDerivedValue<CameraPose>(() => ({
    azimuth: azimuth.get(),
    elevation: elevation.get(),
    roll: roll.get(),
  }));

  const target = useDerivedValue(() => {
    const position = positionOnTrack(track, time.get());
    return position ? projectToCamera(position, pose.get(), viewport) : null;
  });

  const path = useDerivedValue(() => {
    const builder = Skia.PathBuilder.Make();
    for (const segment of trackSegments(track, pose.get(), viewport)) {
      segment.forEach((point, index) =>
        index === 0 ? builder.moveTo(point.x, point.y) : builder.lineTo(point.x, point.y),
      );
    }
    return builder.build();
  });

  const targetX = useDerivedValue(() => target.get()?.x ?? -100);
  const targetY = useDerivedValue(() => target.get()?.y ?? -100);
  const targetOpacity = useDerivedValue(() => (target.get()?.onScreen ? 1 : 0));

  const arrow = useDerivedValue(() => {
    const value = target.get();
    const builder = Skia.PathBuilder.Make();
    if (!value || value.onScreen) {
      return builder.build();
    }
    const at = edgePoint(value.direction, viewport, EDGE_INSET);
    const angle = value.direction * DEG;
    const along = { x: Math.sin(angle), y: -Math.cos(angle) };
    const across = { x: -along.y, y: along.x };
    builder.moveTo(at.x + along.x * 12, at.y + along.y * 12);
    builder.lineTo(at.x - along.x * 9 + across.x * 11, at.y - along.y * 9 + across.y * 11);
    builder.lineTo(at.x - along.x * 9 - across.x * 11, at.y - along.y * 9 - across.y * 11);
    builder.close();
    return builder.build();
  });

  const moonPoint = useDerivedValue(() =>
    moon ? projectToCamera(moon, pose.get(), viewport) : null,
  );
  const moonX = useDerivedValue(() => moonPoint.get()?.x ?? -100);
  const moonY = useDerivedValue(() => moonPoint.get()?.y ?? -100);
  const moonLabelX = useDerivedValue(() => moonX.get() + MOON_RADIUS + 6);
  const moonLabelY = useDerivedValue(() => moonY.get() + 4);
  const moonOpacity = useDerivedValue(() => (moonPoint.get()?.onScreen ? 1 : 0));

  const ring = Skia.PathBuilder.Make()
    .addCircle(centerX, centerY, toleranceRadius + 8)
    .build();

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityLabel="Camera view">
      <Path path={path} color={colors.accent} style="stroke" strokeWidth={2} opacity={0.6} />
      <Circle
        cx={centerX}
        cy={centerY}
        r={toleranceRadius}
        color={colors.text}
        style="stroke"
        strokeWidth={1}
        opacity={0.6}
      />
      <Line
        p1={vec(centerX - 24, centerY)}
        p2={vec(centerX + 24, centerY)}
        color={colors.text}
        strokeWidth={1.5}
      />
      <Line
        p1={vec(centerX, centerY - 24)}
        p2={vec(centerX, centerY + 24)}
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
      <Group opacity={moonOpacity}>
        <Circle
          cx={moonX}
          cy={moonY}
          r={MOON_RADIUS}
          color={colors.warning}
          style="stroke"
          strokeWidth={1.5}
        />
        <Text x={moonLabelX} y={moonLabelY} text={moonLabel} font={font} color={colors.warning} />
      </Group>
      <Group opacity={targetOpacity}>
        <Circle cx={targetX} cy={targetY} r={TARGET_RADIUS} color={colors.accent} />
      </Group>
      <Path path={arrow} color={colors.accent} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
});
