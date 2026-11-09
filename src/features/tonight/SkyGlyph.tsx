import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';

import { positionOnTrack } from '@/domain/sky';
import type { TrackPoint } from '@/domain/types';
import { projectToDome, type DomeLayout } from '@/ui/domeProjection';
import { colors } from '@/ui/theme';

type SkyGlyphProps = {
  track: TrackPoint[];
  startAt: number;
  endAt: number;
  size: number;
};

export function visibleTrackPath(
  track: TrackPoint[],
  startAt: number,
  endAt: number,
  layout: DomeLayout,
) {
  const visible = [
    positionOnTrack(track, startAt),
    ...track.filter((point) => point.time > startAt && point.time < endAt),
    positionOnTrack(track, endAt),
  ]
    .map((point) => (point ? projectToDome(point, layout, 0) : null))
    .filter((point) => point !== null);

  const builder = Skia.PathBuilder.Make();
  visible.forEach((point, index) =>
    index === 0 ? builder.moveTo(point.x, point.y) : builder.lineTo(point.x, point.y),
  );
  return { path: builder.build(), first: visible[0] };
}

export function SkyGlyph({ track, startAt, endAt, size }: SkyGlyphProps) {
  const stroke = size > 40 ? 2 : 1.5;
  const layout = { centerX: size / 2, centerY: size / 2, radius: size / 2 - stroke };
  const { path, first } = visibleTrackPath(track, startAt, endAt, layout);

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Circle
        cx={layout.centerX}
        cy={layout.centerY}
        r={layout.radius}
        color={colors.border}
        style="stroke"
        strokeWidth={1}
      />
      <Path
        path={path}
        color={colors.accent}
        style="stroke"
        strokeWidth={stroke}
        strokeCap="round"
      />
      {first && <Circle cx={first.x} cy={first.y} r={stroke * 1.6} color={colors.accent} />}
    </Canvas>
  );
}
