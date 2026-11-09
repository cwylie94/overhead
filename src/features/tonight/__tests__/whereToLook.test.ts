import { skyHeight, whereToLook } from '../whereToLook';

const MINUTE = 60_000;
const START = 1_000_000;

const pass = {
  startAt: START,
  endAt: START + 4 * MINUTE,
  track: [
    { time: START, azimuth: 45, elevation: 10 },
    { time: START + 2 * MINUTE, azimuth: 90, elevation: 50 },
    { time: START + 4 * MINUTE, azimuth: 180, elevation: 20 },
  ],
};

describe('skyHeight', () => {
  describe('given an elevation in degrees', () => {
    test.each([
      { elevation: 0, height: 'horizon' },
      { elevation: 14.9, height: 'horizon' },
      { elevation: 15, height: 'low' },
      { elevation: 34, height: 'low' },
      { elevation: 35, height: 'halfway' },
      { elevation: 59, height: 'halfway' },
      { elevation: 60, height: 'high' },
      { elevation: 79, height: 'high' },
      { elevation: 80, height: 'overhead' },
      { elevation: 90, height: 'overhead' },
    ])('then it describes $elevation° as $height', ({ elevation, height }) => {
      expect(skyHeight(elevation)).toBe(height);
    });
  });
});

describe('whereToLook', () => {
  describe('given the pass has not started', () => {
    test('then it points to where the pass appears and where it heads', () => {
      expect(whereToLook(pass, START - 10 * MINUTE)).toEqual({
        stage: 'upcoming',
        position: { azimuth: 45, elevation: 10 },
        direction: 'NE',
        height: 'horizon',
        toward: 'S',
      });
    });
  });

  describe('given the pass is halfway across the sky', () => {
    test('then it follows the pass', () => {
      expect(whereToLook(pass, START + 2 * MINUTE)).toMatchObject({
        stage: 'live',
        direction: 'E',
        height: 'halfway',
        toward: 'S',
      });
    });
  });

  describe('given the pass has almost reached where it heads', () => {
    test('then it stops saying where the pass heads', () => {
      expect(whereToLook(pass, START + 4 * MINUTE - 1)).toMatchObject({
        stage: 'live',
        direction: 'S',
        toward: null,
      });
    });
  });

  describe('given the pass has ended', () => {
    test('then it points to where the pass was last seen', () => {
      expect(whereToLook(pass, START + 10 * MINUTE)).toEqual({
        stage: 'over',
        position: { azimuth: 180, elevation: 20 },
        direction: 'S',
        height: 'low',
        toward: null,
      });
    });
  });

  describe('given a pass without a track to follow', () => {
    test('then it gives up', () => {
      expect(whereToLook({ ...pass, track: [] }, START)).toBeNull();
    });
  });
});
