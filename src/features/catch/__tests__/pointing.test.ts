import {
  elevationFromGravity,
  guideAngle,
  manualPointing,
  offsetToTarget,
  pulseInterval,
  smoothVector,
  aimCounts,
} from '../pointing';

const G = 9.81;

describe('elevationFromGravity', () => {
  describe('given the phone held in different poses', () => {
    test.each([
      {
        pose: 'lying flat, screen up, camera at the ground',
        gravity: { x: 0, y: 0, z: -G },
        elevation: -90,
      },
      { pose: 'held upright, camera at the horizon', gravity: { x: 0, y: -G, z: 0 }, elevation: 0 },
      {
        pose: 'held overhead, screen down, camera at the zenith',
        gravity: { x: 0, y: 0, z: G },
        elevation: 90,
      },
      {
        pose: 'tilted back 45 degrees',
        gravity: { x: 0, y: -G * Math.SQRT1_2, z: G * Math.SQRT1_2 },
        elevation: 45,
      },
      { pose: 'upright in landscape', gravity: { x: -G, y: 0, z: 0 }, elevation: 0 },
    ])('then it reads $elevation° for a phone $pose', ({ gravity, elevation }) => {
      expect(elevationFromGravity(gravity)).toBeCloseTo(elevation, 6);
    });
  });

  describe('given no reading', () => {
    test('then it returns the horizon', () => {
      expect(elevationFromGravity({ x: 0, y: 0, z: 0 })).toBe(0);
    });
  });
});

describe('offsetToTarget', () => {
  describe('given a level target 20° to the right through north', () => {
    test('then the target is 20° right and level', () => {
      const offset = offsetToTarget({ azimuth: 350, elevation: 0 }, { azimuth: 10, elevation: 0 });

      expect(offset.right).toBeCloseTo(20, 6);
      expect(offset.up).toBe(0);
    });
  });

  describe('given the same azimuth gap low and high in the sky', () => {
    test('then azimuth counts for less high in the sky', () => {
      const low = offsetToTarget({ azimuth: 0, elevation: 0 }, { azimuth: 10, elevation: 0 });
      const high = offsetToTarget({ azimuth: 0, elevation: 80 }, { azimuth: 10, elevation: 80 });

      expect(high.right).toBeLessThan(low.right / 4);
    });
  });
});

describe('guideAngle', () => {
  describe('given a target to the right and level', () => {
    test('then the guide points right', () => {
      const offset = offsetToTarget({ azimuth: 350, elevation: 0 }, { azimuth: 10, elevation: 0 });

      expect(guideAngle(offset)).toBeCloseTo(90, 6);
    });
  });

  describe('given a target straight above', () => {
    test('then the guide points up', () => {
      const offset = offsetToTarget(
        { azimuth: 100, elevation: 20 },
        { azimuth: 100, elevation: 50 },
      );

      expect(guideAngle(offset)).toBeCloseTo(0, 6);
    });
  });
});

describe('manualPointing', () => {
  const start = { azimuth: 10, elevation: 0 };

  describe('given a drag to the right', () => {
    test('then it turns left, like moving the sky', () => {
      expect(manualPointing(start, 40, 0, 4)).toEqual({ azimuth: 0, elevation: 0 });
    });
  });

  describe('given a drag down', () => {
    test('then it looks up, like moving the sky', () => {
      expect(manualPointing(start, 0, 40, 4)).toEqual({ azimuth: 10, elevation: 10 });
    });
  });

  describe('given a drag as far as a target high in the sky', () => {
    const highStart = { azimuth: 100, elevation: 60 };
    const target = { azimuth: 90, elevation: 60 };

    test('then the target moves with the finger', () => {
      const dragX = offsetToTarget(highStart, target).right * -4;
      const aimed = manualPointing(highStart, dragX, 0, 4);

      expect(Math.abs(offsetToTarget(aimed, target).right)).toBeLessThan(0.01);
    });
  });

  describe('given a drag past north and beyond the zenith', () => {
    test('then it wraps the azimuth and keeps the elevation in range', () => {
      expect(manualPointing({ azimuth: 5, elevation: 0 }, 40, 400, 4)).toEqual({
        azimuth: 355,
        elevation: 90,
      });
    });
  });
});

describe('pulseInterval', () => {
  describe('given no aim error or one too large to guide', () => {
    test.each([{ error: null }, { error: 45 }])(
      'then an aim error of $error doesn’t pulse',
      ({ error }) => {
        expect(pulseInterval(error)).toBe(null);
      },
    );
  });

  describe('given an aim closing in on the target', () => {
    test.each([
      { error: 40, interval: 800 },
      { error: 25, interval: 500 },
      { error: 10, interval: 120 },
      { error: 2, interval: 120 },
    ])('then an aim error of $error pulses every $interval ms', ({ error, interval }) => {
      expect(pulseInterval(error)).toBe(interval);
    });
  });
});

describe('smoothVector', () => {
  describe('given no earlier reading', () => {
    test('then it takes the first reading as it is', () => {
      expect(smoothVector(null, { x: 1, y: 2, z: 3 }, 0.25)).toEqual({ x: 1, y: 2, z: 3 });
    });
  });

  describe('given an earlier reading', () => {
    test('then it moves part of the way towards the new reading', () => {
      expect(smoothVector({ x: 0, y: -8, z: 0 }, { x: 4, y: -4, z: 8 }, 0.25)).toEqual({
        x: 1,
        y: -7,
        z: 2,
      });
    });
  });
});

describe('aimCounts', () => {
  const onTarget = { error: 3, now: 1_000, startAt: 500 };

  describe('given sensors and no finger on the screen', () => {
    test('then aiming counts', () => {
      expect(aimCounts({ mode: 'sensors', touching: false, ...onTarget })).toBe(true);
    });
  });

  describe('given drag to aim and no finger on the screen', () => {
    test('then aiming doesn’t count', () => {
      expect(aimCounts({ mode: 'manual', touching: false, ...onTarget })).toBe(false);
    });
  });

  describe('given drag to aim and a finger on the screen', () => {
    test('then aiming counts', () => {
      expect(aimCounts({ mode: 'manual', touching: true, ...onTarget })).toBe(true);
    });
  });

  describe('given the pass hasn’t started', () => {
    test('then nothing counts', () => {
      expect(aimCounts({ mode: 'sensors', touching: false, ...onTarget, now: 400 })).toBe(false);
    });
  });

  describe('given no position for the pass', () => {
    test('then nothing counts', () => {
      expect(aimCounts({ mode: 'sensors', touching: false, ...onTarget, error: null })).toBe(false);
    });
  });
});
