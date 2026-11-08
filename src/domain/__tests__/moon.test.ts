import moonFixture from '../__fixtures__/skyfield-moon-london.json';
import { moonLookAngles } from '../moon';
import { toGeodetic } from '../observer';
import { angularSeparation } from '../sky';

const observer = toGeodetic(moonFixture.observer);
const MAX_ERROR_DEGREES = 0.4;

describe('moon position', () => {
  test.each(moonFixture.positions.map((sample) => [sample.time, sample] as const))(
    'matches Skyfield at %i',
    (time, expected) => {
      const angles = moonLookAngles(observer, time);

      expect(angularSeparation(angles, expected)).toBeLessThan(MAX_ERROR_DEGREES);
    },
  );

  test('stays within the Moon’s range of distances, give or take an Earth radius', () => {
    for (const { time } of moonFixture.positions) {
      const { rangeKm } = moonLookAngles(observer, time);
      expect(rangeKm).toBeGreaterThan(345_000);
      expect(rangeKm).toBeLessThan(415_000);
    }
  });
});
