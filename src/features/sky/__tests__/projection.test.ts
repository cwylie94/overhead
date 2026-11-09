import { domeToSky, projectToDome, unwrapHeading } from '../projection';

const layout = { centerX: 200, centerY: 200, radius: 180 };

describe('projectToDome', () => {
  describe('given north at the top', () => {
    test.each([
      {
        place: 'the zenith at the centre',
        position: { azimuth: 123, elevation: 90 },
        x: 200,
        y: 200,
      },
      {
        place: 'north on the horizon at the top',
        position: { azimuth: 0, elevation: 0 },
        x: 200,
        y: 20,
      },
      {
        place: 'east on the horizon on the right, like a map held flat',
        position: { azimuth: 90, elevation: 0 },
        x: 380,
        y: 200,
      },
      {
        place: 'south on the horizon at the bottom',
        position: { azimuth: 180, elevation: 0 },
        x: 200,
        y: 380,
      },
      {
        place: 'west halfway up on the left',
        position: { azimuth: 270, elevation: 45 },
        x: 110,
        y: 200,
      },
    ])('then it puts $place', ({ position, x, y }) => {
      const point = projectToDome(position, layout, 0)!;

      expect(point.x).toBeCloseTo(x, 6);
      expect(point.y).toBeCloseTo(y, 6);
    });
  });

  describe('given a position below the horizon', () => {
    test('then it hides it', () => {
      expect(projectToDome({ azimuth: 0, elevation: -1 }, layout, 0)).toBeNull();
    });
  });

  describe('given compass mode with the user facing east', () => {
    const facingEast = 90;

    test('then it puts the heading at the top', () => {
      const point = projectToDome({ azimuth: 90, elevation: 0 }, layout, facingEast)!;

      expect(point.x).toBeCloseTo(200, 6);
      expect(point.y).toBeCloseTo(20, 6);
    });

    test('then it keeps what is on the user’s right on the right', () => {
      const toTheSouth = projectToDome({ azimuth: 180, elevation: 0 }, layout, facingEast)!;

      expect(toTheSouth.x).toBeCloseTo(380, 6);
      expect(toTheSouth.y).toBeCloseTo(200, 6);
    });
  });
});

describe('domeToSky', () => {
  describe('given a point projected onto the dome', () => {
    test.each([{ rotation: 0 }, { rotation: 37 }, { rotation: 200 }])(
      'then it inverts the projection with a rotation of $rotation degrees',
      ({ rotation }) => {
        const position = { azimuth: 250, elevation: 33 };
        const back = domeToSky(projectToDome(position, layout, rotation)!, layout, rotation)!;

        expect(back.azimuth).toBeCloseTo(250, 6);
        expect(back.elevation).toBeCloseTo(33, 6);
      },
    );
  });

  describe('given a point outside the dome', () => {
    test('then it returns null', () => {
      expect(domeToSky({ x: 0, y: 0 }, layout, 0)).toBeNull();
    });
  });
});

describe('unwrapHeading', () => {
  describe('given a previous heading and a new compass reading', () => {
    test.each([
      { previous: 350, next: 10, expected: 370 },
      { previous: 10, next: 350, expected: -10 },
      { previous: 100, next: 120, expected: 120 },
      { previous: 720, next: 5, expected: 725 },
    ])(
      'then from $previous to a heading of $next it continues to $expected',
      ({ previous, next, expected }) => {
        expect(unwrapHeading(previous, next)).toBe(expected);
      },
    );
  });
});
