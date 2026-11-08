import type { Observer } from '@/domain/observer';

export function parseTestLocation(value: string | undefined): Observer | null {
  const parts = (value ?? '').split(',').map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  const [latitude, longitude] = parts as [number, number];
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  return { latitude, longitude, altitude: 0 };
}

export const TEST_LOCATION = parseTestLocation(process.env.EXPO_PUBLIC_TEST_LOCATION);
