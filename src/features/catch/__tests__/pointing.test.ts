import {
  elevationFromGravity,
  guideAngle,
  manualPointing,
  offsetToTarget,
  pulseInterval,
  smoothVector,
  wrapDegrees,
} from '../pointing';

const G = 9.81;

describe('elevationFromGravity', () => {
  test.each([
    ['lying flat, screen up, camera at the ground', { x: 0, y: 0, z: -G }, -90],
    ['held upright, camera at the horizon', { x: 0, y: -G, z: 0 }, 0],
    ['held overhead, screen down, camera at the zenith', { x: 0, y: 0, z: G }, 90],
    ['tilted back 45 degrees', { x: 0, y: -G * Math.SQRT1_2, z: G * Math.SQRT1_2 }, 45],
    ['upright in landscape', { x: -G, y: 0, z: 0 }, 0],
  ])('%s', (_, gravity, expected) => {
    expect(elevationFromGravity(gravity)).toBeCloseTo(expected, 6);
  });

  test('returns the horizon when there is no reading', () => {
    expect(elevationFromGravity({ x: 0, y: 0, z: 0 })).toBe(0);
  });
});

describe('wrapDegrees', () => {
  test.each([
    [10, 10],
    [190, -170],
    [-190, 170],
    [360, 0],
    [725, 5],
  ])('%d wraps to %d', (input, expected) => {
    expect(wrapDegrees(input)).toBeCloseTo(expected, 9);
  });
});

describe('offsetToTarget and guideAngle', () => {
  test('a target to the right and level points the guide right', () => {
    const offset = offsetToTarget({ azimuth: 350, elevation: 0 }, { azimuth: 10, elevation: 0 });

    expect(offset.right).toBeCloseTo(20, 6);
    expect(offset.up).toBe(0);
    expect(guideAngle(offset)).toBeCloseTo(90, 6);
  });

  test('a target straight above points the guide up', () => {
    const offset = offsetToTarget({ azimuth: 100, elevation: 20 }, { azimuth: 100, elevation: 50 });

    expect(guideAngle(offset)).toBeCloseTo(0, 6);
  });

  test('azimuth counts for less high in the sky', () => {
    const low = offsetToTarget({ azimuth: 0, elevation: 0 }, { azimuth: 10, elevation: 0 });
    const high = offsetToTarget({ azimuth: 0, elevation: 80 }, { azimuth: 10, elevation: 80 });

    expect(high.right).toBeLessThan(low.right / 4);
  });
});

describe('manualPointing', () => {
  test('dragging right turns left and dragging down looks up, like moving the sky', () => {
    const start = { azimuth: 10, elevation: 0 };

    expect(manualPointing(start, 40, 0, 4)).toEqual({ azimuth: 0, elevation: 0 });
    expect(manualPointing(start, 0, 40, 4)).toEqual({ azimuth: 10, elevation: 10 });
  });

  test('moves the target with the finger at any elevation', () => {
    const start = { azimuth: 100, elevation: 60 };
    const target = { azimuth: 90, elevation: 60 };
    const dragX = offsetToTarget(start, target).right * -4;

    const aimed = manualPointing(start, dragX, 0, 4);

    expect(Math.abs(offsetToTarget(aimed, target).right)).toBeLessThan(0.01);
  });

  test('wraps the azimuth and keeps the elevation in range', () => {
    const aimed = manualPointing({ azimuth: 5, elevation: 0 }, 40, 400, 4);

    expect(aimed).toEqual({ azimuth: 355, elevation: 90 });
  });
});

describe('pulseInterval', () => {
  test.each([
    [null, null],
    [45, null],
    [40, 800],
    [25, 500],
    [10, 120],
    [2, 120],
  ])('an aim error of %s pulses every %s ms', (error, expected) => {
    expect(pulseInterval(error)).toBe(expected);
  });
});

describe('smoothVector', () => {
  test('takes the first reading as it is', () => {
    expect(smoothVector(null, { x: 1, y: 2, z: 3 }, 0.25)).toEqual({ x: 1, y: 2, z: 3 });
  });

  test('moves part of the way towards each new reading', () => {
    expect(smoothVector({ x: 0, y: -8, z: 0 }, { x: 4, y: -4, z: 8 }, 0.25)).toEqual({
      x: 1,
      y: -7,
      z: 2,
    });
  });
});
