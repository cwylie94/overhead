import type { BrightnessTier } from '@/domain/brightness';
import type { Rarity } from '@/domain/types';

export const colors = {
  background: '#05070D',
  surface: '#111522',
  surfaceRaised: '#1A2033',
  border: '#262D44',
  text: '#E8ECF5',
  textMuted: '#8B93A7',
  accent: '#7CC4FF',
  warning: '#F2C46D',
  warningSurface: '#2A2414',
} as const;

export const rarityColors: Readonly<Record<Rarity, string>> = {
  legendary: '#F2C46D',
  rare: '#B79CFF',
  uncommon: '#7FD6A4',
  common: '#8B93A7',
};

export const brightnessColors: Readonly<Record<BrightnessTier, string>> = {
  brilliant: '#FFFFFF',
  bright: '#C9D6F2',
  faint: '#6F7891',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 12,
} as const;

export const typography = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
} as const;
