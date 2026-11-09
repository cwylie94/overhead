import { CITIES } from '@/data/cities';
import type { CityRow } from '@/features/location/citySearch';

import { LONDON, observerForTimeZone } from '../estimatedLocation';

const cities: CityRow[] = [
  ['Madrid', 'Spain', 40.417, -3.704, 3_255_944],
  ['New York City', 'United States', 40.714, -74.006, 8_804_190],
  ['New York Mills', 'United States', 46.518, -95.376, 1_200],
  ['Bogotá', 'Colombia', 4.61, -74.082, 7_674_366],
  ['Ho Chi Minh City', 'Vietnam', 10.823, 106.63, 8_993_082],
  ['York', 'United Kingdom', 53.958, -1.082, 153_717],
];

describe('observerForTimeZone', () => {
  test('uses the city a time zone is named after', () => {
    expect(observerForTimeZone('Europe/Madrid', cities)).toEqual({
      latitude: 40.417,
      longitude: -3.704,
      altitude: 0,
    });
  });

  test('ignores accents and underscores', () => {
    expect(observerForTimeZone('America/Bogota', cities).latitude).toBe(4.61);
    expect(observerForTimeZone('Asia/Ho_Chi_Minh', cities).latitude).toBe(10.823);
  });

  test('prefers an exact name over a longer one that starts with it', () => {
    expect(observerForTimeZone('Europe/York', cities).latitude).toBe(53.958);
  });

  test('takes the largest city that starts with the name', () => {
    expect(observerForTimeZone('America/New_York', cities).latitude).toBe(40.714);
  });

  test('falls back to London without a matching city', () => {
    expect(observerForTimeZone('Etc/UTC', cities)).toEqual(LONDON);
    expect(observerForTimeZone('Pacific/Nowhere', cities)).toEqual(LONDON);
    expect(observerForTimeZone(null, cities)).toEqual(LONDON);
    expect(observerForTimeZone('', cities)).toEqual(LONDON);
  });

  test.each([
    ['Europe/Paris', 48.9],
    ['America/Los_Angeles', 34.1],
    ['Asia/Tokyo', 35.7],
    ['Australia/Sydney', -33.9],
    ['America/Argentina/Buenos_Aires', -34.6],
  ])('finds %s in the bundled city list', (timeZone, latitude) => {
    expect(observerForTimeZone(timeZone, CITIES).latitude).toBeCloseTo(latitude, 0);
  });
});
