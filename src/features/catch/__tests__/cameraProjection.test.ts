import {
  edgePoint,
  focalLengthPx,
  projectToCamera,
  rollFromGravity,
  trackSegments,
  type CameraPose,
  type CameraViewport,
} from '../cameraProjection';

const G = 9.81;
const DEG = Math.PI / 180;
const view: CameraViewport = { width: 400, height: 800, focalPx: 600 };
const level: CameraPose = { azimuth: 0, elevation: 0, roll: 0 };

describe('rollFromGravity', () => {
  describe('given the phone held at different rolls', () => {
    test.each([
      { phone: 'upright', gravity: { x: 0, y: -G, z: 0 }, roll: 0 },
      { phone: 'turned a quarter clockwise', gravity: { x: G, y: 0, z: 0 }, roll: 90 },
      { phone: 'turned a quarter anticlockwise', gravity: { x: -G, y: 0, z: 0 }, roll: -90 },
      {
        phone: 'tilted back and turned slightly clockwise',
        gravity: { x: 1, y: -5, z: 8 },
        roll: Math.atan2(1, 5) / DEG,
      },
    ])('then it reads the roll of a phone $phone', ({ gravity, roll }) => {
      expect(rollFromGravity(gravity)).toBeCloseTo(roll, 6);
    });
  });
});

describe('focalLengthPx', () => {
  describe('given a 26 mm lens filling a tall portrait view', () => {
    test('then it shows about 67 degrees from top to bottom', () => {
      const focal = focalLengthPx(26, 402, 874);
      const verticalFov = (2 * Math.atan(874 / 2 / focal)) / DEG;

      expect(verticalFov).toBeCloseTo(67.3, 0);
    });
  });

  describe('given a lens twice as long', () => {
    test('then it zooms in twice as far', () => {
      expect(focalLengthPx(52, 402, 874)).toBeCloseTo(2 * focalLengthPx(26, 402, 874), 6);
    });
  });
});

describe('projectToCamera', () => {
  describe('given a target where the camera faces', () => {
    const target = { azimuth: 120, elevation: 35 };
    const pose = { ...level, azimuth: 120, elevation: 35 };

    test('then it puts the target in the centre', () => {
      const point = projectToCamera(target, pose, view);

      expect(point.x).toBeCloseTo(200, 6);
      expect(point.y).toBeCloseTo(400, 6);
    });

    test('then the target is in front and on screen', () => {
      const point = projectToCamera(target, pose, view);

      expect(point.inFront).toBe(true);
      expect(point.onScreen).toBe(true);
    });
  });

  describe('given a target to the right of the camera', () => {
    const target = { azimuth: 10, elevation: 0 };

    test('then it puts the target to the right of centre', () => {
      const point = projectToCamera(target, level, view);

      expect(point.x).toBeCloseTo(200 + 600 * Math.tan(10 * DEG), 6);
      expect(point.y).toBeCloseTo(400, 6);
    });

    test('then it points to the right', () => {
      expect(projectToCamera(target, level, view).direction).toBeCloseTo(90, 6);
    });
  });

  describe('given a target above the camera', () => {
    const target = { azimuth: 0, elevation: 10 };

    test('then it puts the target above centre', () => {
      const point = projectToCamera(target, level, view);

      expect(point.x).toBeCloseTo(200, 6);
      expect(point.y).toBeCloseTo(400 - 600 * Math.tan(10 * DEG), 6);
    });

    test('then it points up', () => {
      expect(projectToCamera(target, level, view).direction).toBeCloseTo(0, 6);
    });
  });

  describe('given a target to the right and the phone rolled a quarter clockwise', () => {
    test('then the sky turns the other way', () => {
      const point = projectToCamera({ azimuth: 10, elevation: 0 }, { ...level, roll: 90 }, view);

      expect(point.x).toBeCloseTo(200, 6);
      expect(point.y).toBeLessThan(400);
    });
  });

  describe('given the camera pointing high in the sky and a target nearer the zenith', () => {
    test('then it shows the target above centre', () => {
      const pose = { azimuth: 200, elevation: 80, roll: 0 };
      const above = projectToCamera({ azimuth: 20, elevation: 85 }, pose, view);

      expect(above.onScreen).toBe(true);
      expect(above.y).toBeLessThan(400);
    });
  });

  describe('given a target behind the camera', () => {
    const target = { azimuth: 170, elevation: 0 };

    test('then it flags the target as behind and off screen', () => {
      const point = projectToCamera(target, level, view);

      expect(point.inFront).toBe(false);
      expect(point.onScreen).toBe(false);
    });

    test('then it points the way to turn', () => {
      expect(projectToCamera(target, level, view).direction).toBeCloseTo(90, 0);
    });
  });

  describe('given a target in front but outside the view', () => {
    test('then it flags the target as in front but off screen', () => {
      const point = projectToCamera({ azimuth: 60, elevation: 0 }, level, view);

      expect(point.inFront).toBe(true);
      expect(point.onScreen).toBe(false);
    });
  });
});

describe('edgePoint', () => {
  describe('given a target to the right', () => {
    test('then it meets the right edge', () => {
      expect(edgePoint(90, view, 20)).toEqual({ x: 380, y: 400 });
    });
  });

  describe('given a target above', () => {
    test('then it meets the top edge', () => {
      const point = edgePoint(0, view, 20);

      expect(point.x).toBeCloseTo(200, 6);
      expect(point.y).toBeCloseTo(20, 6);
    });
  });

  describe('given a target on a diagonal', () => {
    test('then it meets whichever edge comes first', () => {
      const point = edgePoint(135, view, 20);

      expect(point.x).toBeCloseTo(380, 6);
      expect(point.y).toBeCloseTo(580, 6);
    });
  });
});

describe('trackSegments', () => {
  describe('given a path in front of the camera', () => {
    const track = [-20, -10, 0, 10, 20].map((azimuth) => ({ azimuth, elevation: 5 }));

    test('then it joins all the points into one line', () => {
      const [segment, ...rest] = trackSegments(track, level, view);

      expect(rest).toEqual([]);
      expect(segment).toHaveLength(5);
    });

    test('then the middle point is in the centre', () => {
      const [segment] = trackSegments(track, level, view);

      expect(segment![2]!.x).toBeCloseTo(200, 6);
    });
  });

  describe('given a path that goes behind the camera', () => {
    test('then it breaks the line there', () => {
      const track = [60, 80, 100, 120, 260, 280, 300].map((azimuth) => ({
        azimuth,
        elevation: 0,
      }));
      const segments = trackSegments(track, level, view);

      expect(segments.map((segment) => segment.length)).toEqual([2, 2]);
    });
  });
});
