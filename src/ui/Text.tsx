// eslint-disable-next-line no-restricted-imports
import { Text as NativeText, type TextProps } from 'react-native';

export const MAX_FONT_SCALE = 2;

export function Text({ maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }: TextProps) {
  return <NativeText maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}
