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
  test.each([
    ['upright', { x: 0, y: -G, z: 0 }, 0],
    ['turned a quarter clockwise', { x: G, y: 0, z: 0 }, 90],
    ['turned a quarter anticlockwise', { x: -G, y: 0, z: 0 }, -90],
    ['tilted back and turned slightly clockwise', { x: 1, y: -5, z: 8 }, Math.atan2(1, 5) / DEG],
  ])('%s', (_, gravity, expected) => {
    expect(rollFromGravity(gravity)).toBeCloseTo(expected, 6);
  });
});

describe('focalLengthPx', () => {
  test('a 26 mm lens filling a tall portrait view shows about 67 degrees from top to bottom', () => {
    const focal = focalLengthPx(26, 402, 874);
    const verticalFov = (2 * Math.atan(874 / 2 / focal)) / DEG;

    expect(verticalFov).toBeCloseTo(67.3, 0);
  });

  test('a longer lens zooms in', () => {
    expect(focalLengthPx(52, 402, 874)).toBeCloseTo(2 * focalLengthPx(26, 402, 874), 6);
  });
});

describe('projectToCamera', () => {
  test('puts the point the camera faces in the centre', () => {
    const point = projectToCamera(
      { azimuth: 120, elevation: 35 },
      { ...level, azimuth: 120, elevation: 35 },
      view,
    );

    expect(point.x).toBeCloseTo(200, 6);
    expect(point.y).toBeCloseTo(400, 6);
    expect(point.inFront).toBe(true);
    expect(point.onScreen).toBe(true);
  });

  test('puts a target to the right of the camera to the right of centre', () => {
    const point = projectToCamera({ azimuth: 10, elevation: 0 }, level, view);

    expect(point.x).toBeCloseTo(200 + 600 * Math.tan(10 * DEG), 6);
    expect(point.y).toBeCloseTo(400, 6);
    expect(point.direction).toBeCloseTo(90, 6);
  });

  test('puts a target above the camera above centre', () => {
    const point = projectToCamera({ azimuth: 0, elevation: 10 }, level, view);

    expect(point.x).toBeCloseTo(200, 6);
    expect(point.y).toBeCloseTo(400 - 600 * Math.tan(10 * DEG), 6);
    expect(point.direction).toBeCloseTo(0, 6);
  });

  test('turns the sky the other way when the phone is rolled', () => {
    const point = projectToCamera({ azimuth: 10, elevation: 0 }, { ...level, roll: 90 }, view);

    expect(point.x).toBeCloseTo(200, 6);
    expect(point.y).toBeLessThan(400);
  });

  test('works when the camera points high in the sky', () => {
    const pose = { azimuth: 200, elevation: 80, roll: 0 };
    const above = projectToCamera({ azimuth: 20, elevation: 85 }, pose, view);

    expect(above.onScreen).toBe(true);
    expect(above.y).toBeLessThan(400);
  });

  test('flags a target behind the camera and points the way to turn', () => {
    const point = projectToCamera({ azimuth: 170, elevation: 0 }, level, view);

    expect(point.inFront).toBe(false);
    expect(point.onScreen).toBe(false);
    expect(point.direction).toBeCloseTo(90, 0);
  });

  test('flags a target in front but outside the view', () => {
    const point = projectToCamera({ azimuth: 60, elevation: 0 }, level, view);

    expect(point.inFront).toBe(true);
    expect(point.onScreen).toBe(false);
  });
});

describe('edgePoint', () => {
  test('meets the right edge for a target to the right', () => {
    expect(edgePoint(90, view, 20)).toEqual({ x: 380, y: 400 });
  });

  test('meets the top edge for a target above', () => {
    const point = edgePoint(0, view, 20);

    expect(point.x).toBeCloseTo(200, 6);
    expect(point.y).toBeCloseTo(20, 6);
  });

  test('meets whichever edge comes first on a diagonal', () => {
    const point = edgePoint(135, view, 20);

    expect(point.x).toBeCloseTo(380, 6);
    expect(point.y).toBeCloseTo(580, 6);
  });
});

describe('trackSegments', () => {
  test('joins the points in front of the camera', () => {
    const track = [-20, -10, 0, 10, 20].map((azimuth) => ({ azimuth, elevation: 5 }));
    const [segment, ...rest] = trackSegments(track, level, view);

    expect(rest).toEqual([]);
    expect(segment).toHaveLength(5);
    expect(segment![2]!.x).toBeCloseTo(200, 6);
  });

  test('breaks the line where the path goes behind the camera', () => {
    const track = [60, 80, 100, 120, 260, 280, 300].map((azimuth) => ({ azimuth, elevation: 0 }));
    const segments = trackSegments(track, level, view);

    expect(segments.map((segment) => segment.length)).toEqual([2, 2]);
  });
});
