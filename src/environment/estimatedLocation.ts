import { getCalendars } from 'expo-localization';

import { CITIES } from '@/data/cities';
import type { Observer } from '@/domain/observer';
import { foldText, type CityRow } from '@/features/location/citySearch';

export const LONDON: Observer = { latitude: 51.5072, longitude: -0.1276, altitude: 0 };

function placeInTimeZone(timeZone: string): string {
  return foldText((timeZone.split('/').pop() ?? '').replace(/_/g, ' '));
}

export function observerForTimeZone(
  timeZone: string | null | undefined,
  cities: readonly CityRow[],
): Observer {
  const place = timeZone ? placeInTimeZone(timeZone) : '';
  if (!place) {
    return LONDON;
  }
  const match =
    cities.find(([name]) => foldText(name) === place) ??
    cities.find(([name]) => foldText(name).startsWith(`${place} `));
  return match ? { latitude: match[2], longitude: match[3], altitude: 0 } : LONDON;
}

export function estimatedObserver(): Observer {
  return observerForTimeZone(getCalendars()[0]?.timeZone, CITIES);
}
