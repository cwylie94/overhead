import {
  Canvas,
  Circle,
  Group,
  matchFont,
  Path,
  rect,
  rrect,
  Text,
} from '@shopify/react-native-skia';
import { Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { SkyPass } from '@/data/queries';
import { projectToDome, type DomeLayout } from '@/ui/domeProjection';
import { colors } from '@/ui/theme';

import { activeDots, nearestDot } from './domeDots';
import { dotsPath, pathsNear } from './domeGeometry';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const DOT_RADIUS = 5;
const TAP_RADIUS = 28;
const LABEL_INSET = 14;

const font = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 14,
  fontWeight: '600',
});

export type CompassLabels = { N: string; E: string; S: string; W: string };

type SkyDomeProps = {
  size: number;
  passes: SkyPass[];
  time: SharedValue<number>;
  rotation: SharedValue<number>;
  selectedId: number | null;
  labels: CompassLabels;
  onSelect(noradId: number | null): void;
};

function useCompassLabel(azimuth: number, layout: DomeLayout, rotation: SharedValue<number>) {
  const position = useDerivedValue(() => {
    const point = projectToDome(
      { azimuth, elevation: 0 },
      { ...layout, radius: layout.radius + LABEL_INSET },
      rotation.get(),
    )!;
    return { x: point.x - 5, y: point.y + 5 };
  });
  const x = useDerivedValue(() => position.get().x);
  const y = useDerivedValue(() => position.get().y);
  return { x, y };
}

export function SkyDome({
  size,
  passes,
  time,
  rotation,
  selectedId,
  labels,
  onSelect,
}: SkyDomeProps) {
  const layout: DomeLayout = { centerX: size / 2, centerY: size / 2, radius: size / 2 - 24 };
  const zoom = useSharedValue(1);
  const domeClip = rrect(
    rect(
      layout.centerX - layout.radius,
      layout.centerY - layout.radius,
      layout.radius * 2,
      layout.radius * 2,
    ),
    layout.radius,
    layout.radius,
  );
  const zoomAtStart = useSharedValue(1);

  const dots = useDerivedValue(() => activeDots(passes, time.get(), layout, rotation.get()));
  const paths = useDerivedValue(() => pathsNear(passes, time.get(), layout, rotation.get()));
  const dotPath = useDerivedValue(() => dotsPath(dots.get(), DOT_RADIUS / zoom.get()));
  const selectedPath = useDerivedValue(() =>
    dotsPath(
      dots.get().filter((dot) => dot.noradId === selectedId),
      (DOT_RADIUS * 2.2) / zoom.get(),
    ),
  );
  const pathWidth = useDerivedValue(() => 1.5 / zoom.get());
  const ringWidth = useDerivedValue(() => 1 / zoom.get());
  const selectedWidth = useDerivedValue(() => 2 / zoom.get());
  const transform = useDerivedValue(() => [
    { translateX: layout.centerX },
    { translateY: layout.centerY },
    { scale: zoom.get() },
    { translateX: -layout.centerX },
    { translateY: -layout.centerY },
  ]);

  const north = useCompassLabel(0, layout, rotation);
  const east = useCompassLabel(90, layout, rotation);
  const south = useCompassLabel(180, layout, rotation);
  const west = useCompassLabel(270, layout, rotation);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      zoomAtStart.set(zoom.get());
    })
    .onUpdate((event) => {
      zoom.set(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomAtStart.get() * event.scale)));
    });

  const resetZoom = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      zoom.set(withTiming(MIN_ZOOM, { duration: 250 }));
    });

  const tap = Gesture.Tap().onEnd((event) => {
    const scale = zoom.get();
    const point = {
      x: layout.centerX + (event.x - layout.centerX) / scale,
      y: layout.centerY + (event.y - layout.centerY) / scale,
    };
    runOnJS(onSelect)(nearestDot(dots.get(), point, TAP_RADIUS / scale));
  });

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, Gesture.Exclusive(resetZoom, tap))}>
      <Canvas style={{ width: size, height: size }} accessibilityLabel="Sky dome">
        <Circle cx={layout.centerX} cy={layout.centerY} r={layout.radius} color={colors.surface} />
        <Group clip={domeClip}>
          <Group transform={transform}>
            {[30, 60].map((elevation) => (
              <Circle
                key={elevation}
                cx={layout.centerX}
                cy={layout.centerY}
                r={(layout.radius * (90 - elevation)) / 90}
                color={colors.border}
                style="stroke"
                strokeWidth={ringWidth}
              />
            ))}
            <Path
              path={paths}
              color={colors.textMuted}
              style="stroke"
              strokeWidth={pathWidth}
              opacity={0.6}
            />
            <Path
              path={selectedPath}
              color={colors.accent}
              style="stroke"
              strokeWidth={selectedWidth}
            />
            <Path path={dotPath} color={colors.text} />
          </Group>
        </Group>
        <Circle
          cx={layout.centerX}
          cy={layout.centerY}
          r={layout.radius}
          color={colors.textMuted}
          style="stroke"
          strokeWidth={1.5}
        />
        <Text x={north.x} y={north.y} text={labels.N} font={font} color={colors.accent} />
        <Text x={east.x} y={east.y} text={labels.E} font={font} color={colors.textMuted} />
        <Text x={south.x} y={south.y} text={labels.S} font={font} color={colors.textMuted} />
        <Text x={west.x} y={west.y} text={labels.W} font={font} color={colors.textMuted} />
      </Canvas>
    </GestureDetector>
  );
}
