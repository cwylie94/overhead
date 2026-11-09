import {
  BREAK_WIDTH,
  clip,
  hourMarks,
  hourStep,
  nearestPass,
  SPLIT_PADDING,
  timeAtX,
  timelineAxis,
  timelineRange,
  xOfTime,
} from '../timelineLayout';

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

describe('timelineAxis', () => {
  const range = { from: local(8, 19), to: local(9, 7) };

  test('splits a night whose middle has no passes into evening and morning', () => {
    const axis = timelineAxis(range, [passAt(1, local(8, 20)), passAt(2, local(9, 5))]);

    expect(axis.segments).toEqual([
      { from: range.from, to: local(8, 20, 5) + SPLIT_PADDING },
      { from: local(9, 5) - SPLIT_PADDING, to: range.to },
    ]);
  });

  test('keeps one stretch when the passes are spread through the night', () => {
    const passes = [passAt(1, local(8, 20)), passAt(2, local(8, 22)), passAt(3, local(9, 0))];

    expect(timelineAxis(range, passes).segments).toEqual([range]);
  });

  test('counts a long pass as covering the time it is up', () => {
    const long = { id: 1, startAt: local(8, 20), endAt: local(9, 1) };

    expect(timelineAxis(range, [long, passAt(2, local(9, 3))]).segments).toEqual([range]);
  });
});

describe('xOfTime and timeAtX', () => {
  const axis = {
    segments: [
      { from: 0, to: 60 * MINUTE },
      { from: 300 * MINUTE, to: 360 * MINUTE },
    ],
  };
  const width = 120 + BREAK_WIDTH;

  test('gives both stretches the same scale with a break between them', () => {
    expect(xOfTime(30 * MINUTE, axis, width)).toBe(30);
    expect(xOfTime(300 * MINUTE, axis, width)).toBe(60 + BREAK_WIDTH);
    expect(xOfTime(360 * MINUTE, axis, width)).toBe(width);
  });

  test('puts a time in the gap on the break', () => {
    expect(xOfTime(200 * MINUTE, axis, width)).toBe(60 + BREAK_WIDTH / 2);
  });

  test('maps a position back to its time', () => {
    expect(timeAtX(30, axis, width)).toBe(30 * MINUTE);
    expect(timeAtX(60 + BREAK_WIDTH + 30, axis, width)).toBe(330 * MINUTE);
  });

  test('snaps a touch on the break to the nearer stretch', () => {
    expect(timeAtX(62, axis, width)).toBe(60 * MINUTE);
    expect(timeAtX(60 + BREAK_WIDTH - 2, axis, width)).toBe(300 * MINUTE);
  });

  test('stays on the night past either end', () => {
    expect(timeAtX(-10, axis, width)).toBe(0);
    expect(timeAtX(width + 10, axis, width)).toBe(360 * MINUTE);
  });
});

describe('hourStep', () => {
  test('labels every hour when there is room and spaces them out when there is not', () => {
    const night = (hours: number) => ({ segments: [{ from: 0, to: hours * HOUR }] });

    expect(hourStep(night(6), 360)).toBe(1);
    expect(hourStep(night(11), 360)).toBe(2);
    expect(hourStep(night(11), 200)).toBe(3);
  });
});
