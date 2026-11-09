import { nightSky } from '../nightSky';

const MINUTE = 60_000;
const london = { latitude: 51.5072, longitude: -0.1276, altitude: 0 };
const svalbard = { latitude: 78.22, longitude: 15.65, altitude: 0 };
const utc = (day: number, hour: number, minute: number) => Date.UTC(2026, 10, day, hour, minute);

describe('nightSky', () => {
  describe('given London on 8 November', () => {
    const at = utc(8, 12, 0);

    test.each([
      { event: 'sunset', field: 'sunset', expected: utc(8, 16, 21) },
      { event: 'the end of civil twilight', field: 'darkFrom', expected: utc(8, 16, 58) },
      { event: 'the start of civil twilight', field: 'darkUntil', expected: utc(9, 6, 31) },
      { event: 'sunrise', field: 'sunrise', expected: utc(9, 7, 8) },
    ] as const)('then it finds $event', ({ field, expected }) => {
      expect(Math.abs(nightSky(london, at)[field]! - expected)).toBeLessThan(4 * MINUTE);
    });

    test('then it marks when the Moon is above the horizon', () => {
      const sky = nightSky(london, at);

      for (const interval of sky.moonUp) {
        expect(interval.to).toBeGreaterThan(interval.from);
      }
      expect(sky.moonUp.length).toBeGreaterThan(0);
    });
  });

  describe('given Svalbard in the Arctic summer', () => {
    const midsummer = Date.UTC(2026, 5, 21, 12);

    test('then it finds no sunset', () => {
      expect(nightSky(svalbard, midsummer).sunset).toBeNull();
    });

    test('then it finds no end of civil twilight', () => {
      expect(nightSky(svalbard, midsummer).darkFrom).toBeNull();
    });
  });
});
