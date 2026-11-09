import { toGeodetic } from '../observer';
import { positionAt } from '../orbit';
import { isSunlit, sunLookAngles, sunPositionEci } from '../sun';
import { london, orbitFor, skyfield } from '../testing/skyfieldFixture';

const SUN_ALONG_X = { x: 1.5e8, y: 0, z: 0 };

function angularDifference(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

describe('sunLookAngles', () => {
  describe('given the Skyfield Sun positions seen from London', () => {
    test.each(skyfield.sun.map((sample) => ({ time: sample.time, expected: sample })))(
      'then it matches Skyfield at $time',
      ({ time, expected }) => {
        const angles = sunLookAngles(toGeodetic(london), time);

        expect(Math.abs(angles.elevation - expected.elevation)).toBeLessThan(0.02);
        expect(angularDifference(angles.azimuth, expected.azimuth)).toBeLessThan(0.05);
      },
    );
  });
});

describe('isSunlit', () => {
  describe('given the Sun far out along the x axis', () => {
    test.each([
      { where: 'on the day side', satellite: { x: 7000, y: 0, z: 0 } },
      {
        where: 'behind the Earth but high enough to clear its shadow',
        satellite: { x: -7000, y: 6400, z: 0 },
      },
      { where: 'over the terminator', satellite: { x: 0, y: 7000, z: 0 } },
    ])('then a satellite $where is sunlit', ({ satellite }) => {
      expect(isSunlit(satellite, SUN_ALONG_X)).toBe(true);
    });

    test.each([{ where: 'directly behind the Earth', satellite: { x: -7000, y: 0, z: 0 } }])(
      'then a satellite $where is in shadow',
      ({ satellite }) => {
        expect(isSunlit(satellite, SUN_ALONG_X)).toBe(false);
      },
    );
  });

  describe('given the Skyfield samples seen from London', () => {
    test.each(
      skyfield.lookAngles.map((sample) => ({
        noradId: sample.noradId,
        time: sample.time,
        expected: sample,
      })),
    )('then satellite $noradId at $time agrees with Skyfield', ({ noradId, time, expected }) => {
      const position = positionAt(orbitFor(noradId), time)!;

      expect(isSunlit(position, sunPositionEci(time))).toBe(expected.sunlit);
    });
  });
});
