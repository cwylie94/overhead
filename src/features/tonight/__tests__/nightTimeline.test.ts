import { clip, fractionOf, hourMarks, nearestPass, timelineRange } from '../nightTimeline';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const local = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).getTime();

const sky = {
  sunset: local(8, 16, 20),
  darkFrom: local(8, 17),
  darkUntil: local(9, 6, 30),
  sunrise: local(9, 7, 10),
  moonUp: [],
};

const passAt = (id: number, startAt: number) => ({ id, startAt, endAt: startAt + 5 * MINUTE });

describe('timelineRange', () => {
  test('runs from sunset to sunrise', () => {
    expect(timelineRange(sky, [passAt(1, local(8, 20))])).toEqual({
      from: sky.sunset,
      to: sky.sunrise,
    });
  });

  test('stretches to fit passes outside the dark', () => {
    const range = timelineRange(sky, [passAt(1, local(8, 16)), passAt(2, local(9, 7, 20))]);

    expect(range!.from).toBeLessThan(local(8, 16));
    expect(range!.to).toBeGreaterThan(local(9, 7, 25));
  });

  test('falls back to the passes when the sun never sets', () => {
    const range = timelineRange(
      { sunset: null, darkFrom: null, darkUntil: null, sunrise: null, moonUp: [] },
      [passAt(1, local(8, 22)), passAt(2, local(9, 1))],
    );

    expect(range).toEqual({ from: local(8, 21, 40), to: local(9, 1, 25) });
  });

  test('has no range without passes', () => {
    expect(timelineRange(sky, [])).toBeNull();
  });
});

describe('fractionOf', () => {
  const range = { from: 0, to: 100 };

  test.each([
    [25, 0.25],
    [-10, 0],
    [150, 1],
  ])('places %i at %f', (time, expected) => {
    expect(fractionOf(time, range)).toBe(expected);
  });
});

describe('clip', () => {
  test('trims an interval to the range', () => {
    expect(clip({ from: 0, to: 50 }, { from: 20, to: 100 })).toEqual({ from: 20, to: 50 });
  });

  test('drops an interval outside the range', () => {
    expect(clip({ from: 0, to: 10 }, { from: 20, to: 100 })).toBeNull();
  });
});

describe('hourMarks', () => {
  test('marks every third hour inside the range', () => {
    expect(hourMarks({ from: local(8, 16, 20), to: local(9, 7, 10) })).toEqual([
      local(8, 18),
      local(8, 21),
      local(9, 0),
      local(9, 3),
      local(9, 6),
    ]);
  });
});

describe('nearestPass', () => {
  const passes = [passAt(1, local(8, 20)), passAt(2, local(8, 21))];

  test('finds the pass under the touch', () => {
    expect(nearestPass(passes, local(8, 20, 2), 10 * MINUTE)?.id).toBe(1);
  });

  test('finds the closest pass within reach', () => {
    expect(nearestPass(passes, local(8, 20, 50), 10 * MINUTE)?.id).toBe(2);
  });

  test('finds nothing out of reach', () => {
    expect(nearestPass(passes, local(8, 23), HOUR / 2)).toBeNull();
  });
});
