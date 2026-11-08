import { lookAnglesFromEci, toGeodetic } from '../observer';
import { positionAt } from '../orbit';
import { london, orbitFor, skyfield } from '../testing/skyfieldFixture';

function angularDifference(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

describe('look angles', () => {
  test.each(skyfield.lookAngles.map((sample) => [sample.noradId, sample.time, sample] as const))(
    'satellite %i at %i matches Skyfield',
    (noradId, time, expected) => {
      const position = positionAt(orbitFor(noradId), time);
      expect(position).not.toBeNull();

      const angles = lookAnglesFromEci(position!, toGeodetic(london), time);

      expect(Math.abs(angles.elevation - expected.elevation)).toBeLessThan(0.01);
      expect(angularDifference(angles.azimuth, expected.azimuth)).toBeLessThan(0.01);
      expect(Math.abs(angles.rangeKm - expected.rangeKm)).toBeLessThan(0.1);
    },
  );
});
