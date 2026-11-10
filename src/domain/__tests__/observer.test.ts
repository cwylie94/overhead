import { groundDistanceKm, lookAnglesFromEci, toGeodetic } from '../observer';
import { positionAt } from '../orbit';
import { london, orbitFor, skyfield } from '../testing/skyfieldFixture';

function angularDifference(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

describe('lookAnglesFromEci', () => {
  describe('given the Skyfield look angles seen from London', () => {
    test.each(
      skyfield.lookAngles.map((sample) => ({
        noradId: sample.noradId,
        time: sample.time,
        expected: sample,
      })),
    )('then satellite $noradId at $time matches Skyfield', ({ noradId, time, expected }) => {
      const position = positionAt(orbitFor(noradId), time);
      expect(position).not.toBeNull();

      const angles = lookAnglesFromEci(position!, toGeodetic(london), time);

      expect(Math.abs(angles.elevation - expected.elevation)).toBeLessThan(0.01);
      expect(angularDifference(angles.azimuth, expected.azimuth)).toBeLessThan(0.01);
      expect(Math.abs(angles.rangeKm - expected.rangeKm)).toBeLessThan(0.1);
    });
  });
});

describe('groundDistanceKm', () => {
  const paris = { latitude: 48.8566, longitude: 2.3522, altitude: 0 };

  test('then London to Paris is about 344 km', () => {
    expect(groundDistanceKm(london, paris)).toBeCloseTo(344, -1);
  });

  test('then a place is no distance from itself, whatever its altitude', () => {
    expect(groundDistanceKm(london, { ...london, altitude: 1.2 })).toBe(0);
  });

  test('then it is the same both ways', () => {
    expect(groundDistanceKm(paris, london)).toBe(groundDistanceKm(london, paris));
  });
});
