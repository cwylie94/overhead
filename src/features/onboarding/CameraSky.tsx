import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Line,
  Path,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { brightnessColors, brightnessMarkColors, colors } from '@/ui/theme';

import { MOON, SATELLITE, SCENE_BOX, type Scene } from './cameraScenes';

const MOVE_MS = 900;
const RING_MS = 1_400;
const SKY = '#0B1226';
const CROSS = 18;
const RING = 22;

const track = Skia.PathBuilder.Make().moveTo(16, 150).quadTo(120, 20, 248, 80).build();
const horizon = Skia.PathBuilder.Make()
  .moveTo(0, 186)
  .lineTo(40, 174)
  .lineTo(72, 182)
  .lineTo(110, 166)
  .lineTo(150, 176)
  .lineTo(190, 162)
  .lineTo(230, 172)
  .lineTo(260, 160)
  .lineTo(260, 210)
  .lineTo(0, 210)
  .close()
  .build();
const ring = Skia.PathBuilder.Make().addCircle(0, 0, RING).build();
const STARS: [number, number][] = [
  [30, 22],
  [210, 30],
  [172, 46],
  [80, 70],
  [235, 110],
  [60, 120],
];

export function CameraSky({ scene }: { scene: Scene }) {
  const [width, setWidth] = useState(0);
  const overlay = useSharedValue(scene.overlay);
  const offsetX = useSharedValue(scene.offset.x);
  const offsetY = useSharedValue(scene.offset.y);
  const crossX = useSharedValue(scene.crosshair.x);
  const crossY = useSharedValue(scene.crosshair.y);
  const progress = useSharedValue(scene.ring ?? 0);

  useEffect(() => {
    overlay.set(withTiming(scene.overlay, { duration: MOVE_MS / 2 }));
    offsetX.set(withTiming(scene.offset.x, { duration: MOVE_MS }));
    offsetY.set(withTiming(scene.offset.y, { duration: MOVE_MS }));
    crossX.set(withTiming(scene.crosshair.x, { duration: MOVE_MS }));
    crossY.set(withTiming(scene.crosshair.y, { duration: MOVE_MS }));
    progress.set(scene.ring === 1 ? withTiming(1, { duration: RING_MS }) : (scene.ring ?? 0));
  }, [scene, overlay, offsetX, offsetY, crossX, crossY, progress]);

  const scale = width / SCENE_BOX.width;
  const shifted = useDerivedValue(() => [
    { translateX: offsetX.get() },
    { translateY: offsetY.get() },
  ]);
  const crosshair = useDerivedValue(() => [
    { translateX: crossX.get() },
    { translateY: crossY.get() },
  ]);
  const ringEnd = useDerivedValue(() => progress.get());
  const overlayOpacity = useDerivedValue(() => overlay.get());
  const markerColor = scene.marker === 'linedUp' ? colors.success : colors.warning;

  return (
    <View style={styles.box} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
      {width > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Group transform={[{ scale }]}>
            <Rect x={0} y={0} width={SCENE_BOX.width} height={SCENE_BOX.height} color={SKY} />
            {STARS.map(([x, y]) => (
              <Circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} color={brightnessColors.brilliant} />
            ))}
            <Path path={horizon} color={colors.background} />
            <Circle cx={MOON.x} cy={MOON.y} r={10} color={brightnessColors.bright} opacity={0.9} />
            <Group transform={shifted} opacity={overlayOpacity}>
              <Path
                path={track}
                color={brightnessMarkColors.bright}
                style="stroke"
                strokeWidth={1.6}>
                <DashPathEffect intervals={[5, 4]} />
              </Path>
              <Circle cx={SATELLITE.x} cy={SATELLITE.y} r={4.5} color={colors.accent} />
              {scene.marker !== 'hidden' && (
                <Circle
                  cx={MOON.x}
                  cy={MOON.y}
                  r={11}
                  color={markerColor}
                  style="stroke"
                  strokeWidth={1.4}>
                  <DashPathEffect intervals={[3, 2]} />
                </Circle>
              )}
            </Group>
            <Group transform={crosshair}>
              <Circle
                cx={0}
                cy={0}
                r={CROSS}
                color={colors.text}
                style="stroke"
                strokeWidth={1.3}
              />
              <Line p1={vec(0, -26)} p2={vec(0, -12)} color={colors.text} strokeWidth={1.3} />
              <Line p1={vec(0, 12)} p2={vec(0, 26)} color={colors.text} strokeWidth={1.3} />
              <Line p1={vec(-26, 0)} p2={vec(-12, 0)} color={colors.text} strokeWidth={1.3} />
              <Line p1={vec(12, 0)} p2={vec(26, 0)} color={colors.text} strokeWidth={1.3} />
              {scene.ring !== null && (
                <Group transform={[{ rotate: -Math.PI / 2 }]}>
                  <Path path={ring} color={colors.border} style="stroke" strokeWidth={3} />
                  <Path
                    path={ring}
                    color={colors.success}
                    style="stroke"
                    strokeWidth={3}
                    start={0}
                    end={ringEnd}
                  />
                </Group>
              )}
            </Group>
          </Group>
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    aspectRatio: SCENE_BOX.width / SCENE_BOX.height,
  },
});
