import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { icons } from './icons';

type IconProps = {
  name: keyof typeof icons;
  size: number;
  tintColor: string;
  fallback?: ReactNode;
};

export function Icon({ name, size, tintColor, fallback = null }: IconProps) {
  const { fontScale } = useWindowDimensions();
  // Android draws the symbol as text, which grows with the system font size, so its box must too.
  const box = Platform.OS === 'android' ? size * fontScale : size;
  return (
    <SymbolView
      name={icons[name]}
      size={size}
      tintColor={tintColor}
      fallback={fallback}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: box, height: box }}
    />
  );
}
