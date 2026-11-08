import { toGeodetic } from '../observer';
import { positionAt } from '../orbit';
import { isSunlit, sunLookAngles, sunPositionEci } from '../sun';
import { london, orbitFor, skyfield } from '../testing/skyfieldFixture';

function angularDifference(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

describe('sun position', () => {
  test.each(skyfield.sun.map((sample) => [sample.time, sample] as const))(
    'at %i matches Skyfield',
    (time, expected) => {
      const angles = sunLookAngles(toGeodetic(london), time);

      expect(Math.abs(angles.elevation - expected.elevation)).toBeLessThan(0.02);
      expect(angularDifference(angles.azimuth, expected.azimuth)).toBeLessThan(0.05);
    },
  );
});

describe('isSunlit', () => {
  const sun = { x: 1.5e8, y: 0, z: 0 };

  test.each([
    ['on the day side', { x: 7000, y: 0, z: 0 }, true],
    ['directly behind the Earth', { x: -7000, y: 0, z: 0 }, false],
    ['behind the Earth but high enough to clear its shadow', { x: -7000, y: 6400, z: 0 }, true],
    ['over the terminator', { x: 0, y: 7000, z: 0 }, true],
  ])('a satellite %s', (_, satellite, expected) => {
    expect(isSunlit(satellite, sun)).toBe(expected);
  });

  test.each(skyfield.lookAngles.map((sample) => [sample.noradId, sample.time, sample] as const))(
    'satellite %i at %i agrees with Skyfield',
    (noradId, time, expected) => {
      const position = positionAt(orbitFor(noradId), time)!;

      expect(isSunlit(position, sunPositionEci(time))).toBe(expected.sunlit);
    },
  );
});
