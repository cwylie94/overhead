export const colors = {
  background: '#05070D',
  surface: '#111522',
  surfaceRaised: '#1A2033',
  text: '#E8ECF5',
  textMuted: '#8B93A7',
  accent: '#7CC4FF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;
