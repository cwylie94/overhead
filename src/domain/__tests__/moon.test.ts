import moonFixture from '../__fixtures__/skyfield-moon-london.json';
import { moonLookAngles } from '../moon';
import { toGeodetic } from '../observer';
import { angularSeparation } from '../sky';

const observer = toGeodetic(moonFixture.observer);
const MAX_ERROR_DEGREES = 0.4;

describe('moonLookAngles', () => {
  describe('given the Skyfield Moon positions seen from London', () => {
    test.each(moonFixture.positions.map((sample) => ({ time: sample.time, expected: sample })))(
      'then it matches Skyfield at $time',
      ({ time, expected }) => {
        expect(angularSeparation(moonLookAngles(observer, time), expected)).toBeLessThan(
          MAX_ERROR_DEGREES,
        );
      },
    );

    test('then it stays within the Moon’s range of distances, give or take an Earth radius', () => {
      for (const { time } of moonFixture.positions) {
        const { rangeKm } = moonLookAngles(observer, time);
        expect(rangeKm).toBeGreaterThan(345_000);
        expect(rangeKm).toBeLessThan(415_000);
      }
    });
  });
});
