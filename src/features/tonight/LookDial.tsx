import { Canvas, Circle, Line, Path } from '@shopify/react-native-skia';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { TrackPoint } from '@/domain/types';
import { projectToDome } from '@/ui/domeProjection';
import { Text } from '@/ui/Text';
import { colors, typography } from '@/ui/theme';

import { visibleTrackPath } from './SkyGlyph';
import type { LookGuide } from './whereToLook';

const STROKE = 2;
const LABEL_MAX_SCALE = 1.3;
const PATH_OPACITY = 0.45;

type LookDialProps = {
  track: TrackPoint[];
  startAt: number;
  endAt: number;
  guide: LookGuide;
  size: number;
};

export function LookDial({ track, startAt, endAt, guide, size }: LookDialProps) {
  const { t } = useTranslation('common');
  const layout = { centerX: size / 2, centerY: size / 2, radius: size / 2 - STROKE };
  const { path } = visibleTrackPath(track, startAt, endAt, layout);
  const target = projectToDome(guide.position, layout, 0);
  const over = guide.stage === 'over';

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle
          cx={layout.centerX}
          cy={layout.centerY}
          r={layout.radius}
          color={colors.border}
          style="stroke"
          strokeWidth={1}
        />
        <Circle
          cx={layout.centerX}
          cy={layout.centerY}
          r={layout.radius / 2}
          color={colors.border}
          style="stroke"
          strokeWidth={1}
        />
        <Path
          path={path}
          color={colors.textMuted}
          opacity={PATH_OPACITY}
          style="stroke"
          strokeWidth={STROKE}
          strokeCap="round"
        />
        {target && !over && (
          <Line
            p1={{ x: layout.centerX, y: layout.centerY }}
            p2={target}
            color={colors.accent}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
          />
        )}
        {target && (
          <Circle
            cx={target.x}
            cy={target.y}
            r={STROKE * 2.5}
            color={over ? colors.textMuted : colors.accent}
          />
        )}
      </Canvas>
      <Text maxFontSizeMultiplier={LABEL_MAX_SCALE} style={styles.north}>
        {t('compass.N')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  north: {
    ...typography.caption,
    position: 'absolute',
    top: -2,
    alignSelf: 'center',
    paddingHorizontal: 2,
    backgroundColor: colors.surface,
    color: colors.textMuted,
  },
});
