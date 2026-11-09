import { advance, FIRST_POSITION, MOON, SATELLITE, sceneFor, settled } from '../cameraScenes';

function positions(count: number) {
  const seen = [FIRST_POSITION];
  for (let index = 1; index < count; index += 1) {
    seen.push(advance(seen[index - 1]!));
  }
  return seen;
}

describe('camera walkthrough', () => {
  test('plays show camera, the Moon check and the hold, then loops', () => {
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

  test('the Moon check starts off by the compass error and ends lined up', () => {
    const before = sceneFor({ frame: 'moon', beat: 0 });
    const after = sceneFor({ frame: 'moon', beat: 1 });

    expect(before).toMatchObject({ marker: 'off', badge: 'off', showSet: true, crosshair: MOON });
    expect(before.offset).not.toEqual({ x: 0, y: 0 });
    expect(after).toMatchObject({ marker: 'linedUp', badge: 'linedUp', showSet: false });
    expect(after.offset).toEqual({ x: 0, y: 0 });
  });

  test('the hold fills the ring on the satellite and ends caught', () => {
    expect(sceneFor({ frame: 'hold', beat: 0 })).toMatchObject({ ring: 0, crosshair: SATELLITE });
    expect(sceneFor({ frame: 'hold', beat: 1 })).toMatchObject({ ring: 1, badge: 'holding' });
    expect(sceneFor(settled('hold'))).toMatchObject({ ring: 1, badge: 'caught' });
  });

  test('jumping to a frame lands on its end state', () => {
    expect(settled('show')).toEqual({ frame: 'show', beat: 1 });
    expect(settled('moon')).toEqual({ frame: 'moon', beat: 1 });
  });
});
