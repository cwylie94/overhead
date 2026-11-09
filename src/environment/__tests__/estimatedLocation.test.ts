import { CITIES } from '@/data/cities';
import type { CityRow } from '@/data/cities/citySearch';

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
  describe('given a time zone named after a city in the list', () => {
    test('then it uses that city', () => {
      expect(observerForTimeZone('Europe/Madrid', cities)).toEqual({
        latitude: 40.417,
        longitude: -3.704,
        altitude: 0,
      });
    });
  });

  describe('given a city whose name has accents or spaces', () => {
    test.each([
      { timeZone: 'America/Bogota', latitude: 4.61 },
      { timeZone: 'Asia/Ho_Chi_Minh', latitude: 10.823 },
    ])('then $timeZone still finds it', ({ timeZone, latitude }) => {
      expect(observerForTimeZone(timeZone, cities).latitude).toBe(latitude);
    });
  });

  describe('given one city with the exact name and another that starts with it', () => {
    test('then it takes the exact name', () => {
      expect(observerForTimeZone('Europe/York', cities).latitude).toBe(53.958);
    });
  });

  describe('given only cities whose names start with the name', () => {
    test('then it takes the largest', () => {
      expect(observerForTimeZone('America/New_York', cities).latitude).toBe(40.714);
    });
  });

  describe('given a time zone with no matching city', () => {
    test.each(['Etc/UTC', 'Pacific/Nowhere'])('then %s falls back to London', (timeZone) => {
      expect(observerForTimeZone(timeZone, cities)).toEqual(LONDON);
    });
  });

  describe('given no time zone', () => {
    test.each([null, ''])('then %p falls back to London', (timeZone) => {
      expect(observerForTimeZone(timeZone, cities)).toEqual(LONDON);
    });
  });

  describe('given the bundled city list', () => {
    test.each([
      { timeZone: 'Europe/Paris', latitude: 48.9 },
      { timeZone: 'America/Los_Angeles', latitude: 34.1 },
      { timeZone: 'Asia/Tokyo', latitude: 35.7 },
      { timeZone: 'Australia/Sydney', latitude: -33.9 },
      { timeZone: 'America/Argentina/Buenos_Aires', latitude: -34.6 },
    ])('then $timeZone is found near latitude $latitude', ({ timeZone, latitude }) => {
      expect(observerForTimeZone(timeZone, CITIES).latitude).toBeCloseTo(latitude, 0);
    });
  });
});
