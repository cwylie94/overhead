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
  test.each([
    [0, 'horizon'],
    [14.9, 'horizon'],
    [15, 'low'],
    [34, 'low'],
    [35, 'halfway'],
    [59, 'halfway'],
    [60, 'high'],
    [79, 'high'],
    [80, 'overhead'],
    [90, 'overhead'],
  ])('describes %p° as %p', (elevation, expected) => {
    expect(skyHeight(elevation)).toBe(expected);
  });
});

describe('whereToLook', () => {
  test('points to where an upcoming pass appears and where it heads', () => {
    expect(whereToLook(pass, START - 10 * MINUTE)).toEqual({
      stage: 'upcoming',
      position: { azimuth: 45, elevation: 10 },
      direction: 'NE',
      height: 'horizon',
      toward: 'S',
    });
  });

  test('follows a live pass across the sky', () => {
    expect(whereToLook(pass, START + 2 * MINUTE)).toMatchObject({
      stage: 'live',
      direction: 'E',
      height: 'halfway',
      toward: 'S',
    });
  });

  test('stops saying where a pass heads once it is already there', () => {
    expect(whereToLook(pass, START + 4 * MINUTE - 1)).toMatchObject({
      stage: 'live',
      direction: 'S',
      toward: null,
    });
  });

  test('points to where an ended pass was last seen', () => {
    expect(whereToLook(pass, START + 10 * MINUTE)).toEqual({
      stage: 'over',
      position: { azimuth: 180, elevation: 20 },
      direction: 'S',
      height: 'low',
      toward: null,
    });
  });

  test('gives up without a track to follow', () => {
    expect(whereToLook({ ...pass, track: [] }, START)).toBeNull();
  });
});
