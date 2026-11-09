import { nightSky } from '../nightSky';

const MINUTE = 60_000;
const london = { latitude: 51.5072, longitude: -0.1276, altitude: 0 };
const utc = (day: number, hour: number, minute: number) => Date.UTC(2026, 10, day, hour, minute);

describe('nightSky', () => {
  const sky = nightSky(london, utc(8, 12, 0));

  test.each([
    ['sunset', sky.sunset, utc(8, 16, 21)],
    ['the end of civil twilight', sky.darkFrom, utc(8, 16, 58)],
    ['the start of civil twilight', sky.darkUntil, utc(9, 6, 31)],
    ['sunrise', sky.sunrise, utc(9, 7, 8)],
  ])('finds %s in London on 8 November', (_, actual, expected) => {
    expect(Math.abs(actual! - expected)).toBeLessThan(4 * MINUTE);
  });

  test('marks when the Moon is above the horizon', () => {
    for (const interval of sky.moonUp) {
      expect(interval.to).toBeGreaterThan(interval.from);
    }
    expect(sky.moonUp.length).toBeGreaterThan(0);
  });

  test('finds no sunset in the Arctic summer', () => {
    const svalbard = { latitude: 78.22, longitude: 15.65, altitude: 0 };
    const midsummer = nightSky(svalbard, Date.UTC(2026, 5, 21, 12));

    expect(midsummer.sunset).toBeNull();
    expect(midsummer.darkFrom).toBeNull();
  });
});
