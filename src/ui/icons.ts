import type { SymbolViewProps } from 'expo-symbols';

export const icons = {
  bell: { ios: 'bell', android: 'notifications' },
  bellOn: { ios: 'bell.fill', android: 'notifications_active' },
  location: { ios: 'location.fill', android: 'location_on' },
  chosenPlace: { ios: 'mappin.and.ellipse', android: 'pin_drop' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more' },
} as const satisfies Record<string, SymbolViewProps['name']>;
