import { domeToSky, projectToDome, unwrapHeading } from '../projection';

const layout = { centerX: 200, centerY: 200, radius: 180 };

describe('projectToDome', () => {
  test.each([
    ['the zenith at the centre', { azimuth: 123, elevation: 90 }, { x: 200, y: 200 }],
    ['north on the horizon at the top', { azimuth: 0, elevation: 0 }, { x: 200, y: 20 }],
    [
      'east on the horizon on the left, as seen looking up',
      { azimuth: 90, elevation: 0 },
      { x: 20, y: 200 },
    ],
    ['south on the horizon at the bottom', { azimuth: 180, elevation: 0 }, { x: 200, y: 380 }],
    ['west halfway up on the right', { azimuth: 270, elevation: 45 }, { x: 290, y: 200 }],
  ])('puts %s', (_, position, expected) => {
    const point = projectToDome(position, layout, 0)!;

    expect(point.x).toBeCloseTo(expected.x, 6);
    expect(point.y).toBeCloseTo(expected.y, 6);
  });

  test('hides anything below the horizon', () => {
    expect(projectToDome({ azimuth: 0, elevation: -1 }, layout, 0)).toBeNull();
  });

  test('rotates so the heading is at the top in compass mode', () => {
    const point = projectToDome({ azimuth: 90, elevation: 0 }, layout, 90)!;

    expect(point.x).toBeCloseTo(200, 6);
    expect(point.y).toBeCloseTo(20, 6);
  });
});

describe('domeToSky', () => {
  test.each([0, 37, 200])('inverts the projection with a rotation of %d degrees', (rotation) => {
    const position = { azimuth: 250, elevation: 33 };
    const back = domeToSky(projectToDome(position, layout, rotation)!, layout, rotation)!;

    expect(back.azimuth).toBeCloseTo(250, 6);
    expect(back.elevation).toBeCloseTo(33, 6);
  });

  test('returns null outside the dome', () => {
    expect(domeToSky({ x: 0, y: 0 }, layout, 0)).toBeNull();
  });
});

describe('unwrapHeading', () => {
  test.each([
    [350, 10, 370],
    [10, 350, -10],
    [100, 120, 120],
    [720, 5, 725],
  ])('from %d to a heading of %d continues to %d', (previous, next, expected) => {
    expect(unwrapHeading(previous, next)).toBe(expected);
  });
});
