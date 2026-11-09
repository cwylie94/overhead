import { advance, FIRST_POSITION, MOON, SATELLITE, sceneFor, settled } from '../cameraScenes';

function positions(count: number) {
  const seen = [FIRST_POSITION];
  for (let index = 1; index < count; index += 1) {
    seen.push(advance(seen[index - 1]!));
  }
  return seen;
}

describe('advance', () => {
  describe('given the walkthrough starts from its first position', () => {
    test('then it plays show camera, the Moon check and the hold, then loops', () => {
      expect(positions(8).map(({ frame, beat }) => `${frame}:${beat}`)).toEqual([
        'show:0',
        'show:1',
        'moon:0',
        'moon:1',
        'hold:0',
        'hold:1',
        'hold:2',
        'show:0',
      ]);
    });
  });
});

describe('sceneFor', () => {
  describe('given the first beat of the Moon check', () => {
    const scene = sceneFor({ frame: 'moon', beat: 0 });

    test('then the marker is off the Moon with Set showing', () => {
      expect(scene).toMatchObject({ marker: 'off', badge: 'off', showSet: true, crosshair: MOON });
    });

    test('then the sky is offset by the compass error', () => {
      expect(scene.offset).not.toEqual({ x: 0, y: 0 });
    });
  });

  describe('given the last beat of the Moon check', () => {
    const scene = sceneFor({ frame: 'moon', beat: 1 });

    test('then the marker is lined up with Set gone', () => {
      expect(scene).toMatchObject({ marker: 'linedUp', badge: 'linedUp', showSet: false });
    });

    test('then the sky is no longer offset', () => {
      expect(scene.offset).toEqual({ x: 0, y: 0 });
    });
  });

  describe('given the first beat of the hold', () => {
    test('then the ring is empty on the satellite', () => {
      expect(sceneFor({ frame: 'hold', beat: 0 })).toMatchObject({ ring: 0, crosshair: SATELLITE });
    });
  });

  describe('given the second beat of the hold', () => {
    test('then the ring is full and holding', () => {
      expect(sceneFor({ frame: 'hold', beat: 1 })).toMatchObject({ ring: 1, badge: 'holding' });
    });
  });

  describe('given the hold has settled', () => {
    test('then the ring is full and the satellite is caught', () => {
      expect(sceneFor(settled('hold'))).toMatchObject({ ring: 1, badge: 'caught' });
    });
  });
});

describe('settled', () => {
  describe('given a frame to jump to', () => {
    test.each([
      { frame: 'show' as const, beat: 1 },
      { frame: 'moon' as const, beat: 1 },
    ])('then $frame lands on its end state, beat $beat', ({ frame, beat }) => {
      expect(settled(frame)).toEqual({ frame, beat });
    });
  });
});
