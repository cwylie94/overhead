import { StyleSheet, View, type DimensionValue } from 'react-native';

import type { Silhouette } from '@/domain/silhouette';

import { SHAPE_BOX, SILHOUETTE_SHAPES, type Shape } from './silhouetteShapes';

const FILL_ALPHA = 'D9';
const STROKE = 1.5;

type SilhouetteArtProps = {
  silhouette: Silhouette;
  color: string;
  solid?: boolean;
};

const across = (value: number): DimensionValue => `${(value / SHAPE_BOX.width) * 100}%`;
const down = (value: number): DimensionValue => `${(value / SHAPE_BOX.height) * 100}%`;

function ShapeView({ shape, color, solid }: { shape: Shape; color: string; solid: boolean }) {
  const filled = solid || shape.filled;
  const paint = filled
    ? { backgroundColor: solid ? color : `${color}${FILL_ALPHA}` }
    : { borderColor: color, borderWidth: STROKE };

  if (shape.kind === 'circle') {
    return (
      <View
        style={[
          styles.shape,
          paint,
          {
            left: across(shape.cx - shape.r),
            top: down(shape.cy - shape.r),
            width: across(shape.r * 2),
            height: down(shape.r * 2),
            borderRadius: 999,
          },
        ]}
      />
    );
  }
  return (
    <View
      style={[
        styles.shape,
        paint,
        {
          left: across(shape.x),
          top: down(shape.y),
          width: across(shape.w),
          height: down(shape.h),
          borderRadius: shape.round ?? 0,
        },
      ]}
    />
  );
}

export function SilhouetteArt({ silhouette, color, solid = false }: SilhouetteArtProps) {
  return (
    <View
      testID={`silhouette-${silhouette}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.box}>
      {SILHOUETTE_SHAPES[silhouette].map((shape, index) => (
        <ShapeView key={index} shape={shape} color={color} solid={solid} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    aspectRatio: SHAPE_BOX.width / SHAPE_BOX.height,
  },
  shape: {
    position: 'absolute',
  },
});
