import {
  BREAK_WIDTH,
  clip,
  hourMarks,
  hourStep,
  nearestPass,
  spacedOut,
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
const sunNeverSets = { sunset: null, darkFrom: null, darkUntil: null, sunrise: null, moonUp: [] };

const passAt = (id: number, startAt: number) => ({ id, startAt, endAt: startAt + 5 * MINUTE });
const singleStretch = (hours: number) => ({ segments: [{ from: 0, to: hours * HOUR }] });

const NIGHT = { from: local(8, 19), to: local(9, 7) };
const OUTSIDE_THE_DARK = [passAt(1, local(8, 16)), passAt(2, local(9, 7, 20))];
const EVENING_AND_MORNING = {
  segments: [
    { from: 0, to: 60 * MINUTE },
    { from: 300 * MINUTE, to: 360 * MINUTE },
  ],
};
const WIDTH = 120 + BREAK_WIDTH;

describe('timelineRange', () => {
  describe('given a pass in the dark', () => {
    test('then it runs from sunset to sunrise', () => {
      expect(timelineRange(sky, [passAt(1, local(8, 20))])).toEqual({
        from: sky.sunset,
        to: sky.sunrise,
      });
    });
  });

  describe('given passes before sunset and after sunrise', () => {
    test('then it starts before the first pass', () => {
      expect(timelineRange(sky, OUTSIDE_THE_DARK)!.from).toBeLessThan(local(8, 16));
    });

    test('then it ends after the last pass', () => {
      expect(timelineRange(sky, OUTSIDE_THE_DARK)!.to).toBeGreaterThan(local(9, 7, 25));
    });
  });

  describe('given the sun never sets', () => {
    test('then it falls back to the passes', () => {
      expect(
        timelineRange(sunNeverSets, [passAt(1, local(8, 22)), passAt(2, local(9, 1))]),
      ).toEqual({ from: local(8, 21, 40), to: local(9, 1, 25) });
    });
  });

  describe('given no passes', () => {
    test('then it has no range', () => {
      expect(timelineRange(sky, [])).toBeNull();
    });
  });
});

describe('clip', () => {
  describe('given an interval that overlaps the range', () => {
    test('then it trims the interval to the range', () => {
      expect(clip({ from: 0, to: 50 }, { from: 20, to: 100 })).toEqual({ from: 20, to: 50 });
    });
  });

  describe('given an interval outside the range', () => {
    test('then it drops the interval', () => {
      expect(clip({ from: 0, to: 10 }, { from: 20, to: 100 })).toBeNull();
    });
  });
});

describe('hourMarks', () => {
  describe('given a range from sunset to sunrise', () => {
    test('then it marks every third hour inside the range', () => {
      expect(hourMarks({ from: local(8, 16, 20), to: local(9, 7, 10) })).toEqual([
        local(8, 18),
        local(8, 21),
        local(9, 0),
        local(9, 3),
        local(9, 6),
      ]);
    });
  });
});

describe('nearestPass', () => {
  describe('given passes at 8 PM and 9 PM', () => {
    const passes = [passAt(1, local(8, 20)), passAt(2, local(8, 21))];

    test('then it finds the pass under the touch', () => {
      expect(nearestPass(passes, local(8, 20, 2), 10 * MINUTE)?.id).toBe(1);
    });

    test('then it finds the closest pass within reach', () => {
      expect(nearestPass(passes, local(8, 20, 50), 10 * MINUTE)?.id).toBe(2);
    });

    test('then it finds nothing out of reach', () => {
      expect(nearestPass(passes, local(8, 23), HOUR / 2)).toBeNull();
    });
  });
});

describe('timelineAxis', () => {
  describe('given a night whose middle has no passes', () => {
    const passes = [passAt(1, local(8, 20)), passAt(2, local(9, 5))];

    test('then it splits the night into evening and morning', () => {
      expect(timelineAxis(NIGHT, passes).segments).toEqual([
        { from: NIGHT.from, to: local(8, 20, 5) + SPLIT_PADDING },
        { from: local(9, 5) - SPLIT_PADDING, to: NIGHT.to },
      ]);
    });
  });

  describe('given passes spread through the night', () => {
    const passes = [passAt(1, local(8, 20)), passAt(2, local(8, 22)), passAt(3, local(9, 0))];

    test('then it keeps one stretch', () => {
      expect(timelineAxis(NIGHT, passes).segments).toEqual([NIGHT]);
    });
  });

  describe('given a long pass that is up through the middle of the night', () => {
    const passes = [{ id: 1, startAt: local(8, 20), endAt: local(9, 1) }, passAt(2, local(9, 3))];

    test('then it counts the time the pass is up and keeps one stretch', () => {
      expect(timelineAxis(NIGHT, passes).segments).toEqual([NIGHT]);
    });
  });
});

describe('xOfTime', () => {
  describe('given an evening and a morning stretch with a break between them', () => {
    test.each([
      { time: 'halfway through the evening', at: 30 * MINUTE, x: 30 },
      { time: 'the start of the morning', at: 300 * MINUTE, x: 60 + BREAK_WIDTH },
      { time: 'the end of the morning', at: 360 * MINUTE, x: WIDTH },
    ])('then $time sits at the same scale across both stretches', ({ at, x }) => {
      expect(xOfTime(at, EVENING_AND_MORNING, WIDTH)).toBe(x);
    });

    test('then a time in the gap sits on the break', () => {
      expect(xOfTime(200 * MINUTE, EVENING_AND_MORNING, WIDTH)).toBe(60 + BREAK_WIDTH / 2);
    });
  });
});

describe('timeAtX', () => {
  describe('given an evening and a morning stretch with a break between them', () => {
    test.each([
      { touch: 'halfway along the evening', x: 30, time: 30 * MINUTE },
      { touch: 'halfway along the morning', x: 60 + BREAK_WIDTH + 30, time: 330 * MINUTE },
    ])('then a touch $touch maps back to its time', ({ x, time }) => {
      expect(timeAtX(x, EVENING_AND_MORNING, WIDTH)).toBe(time);
    });

    test.each([
      { touch: 'just after the evening', x: 62, time: 60 * MINUTE },
      { touch: 'just before the morning', x: 60 + BREAK_WIDTH - 2, time: 300 * MINUTE },
    ])('then a touch on the break $touch snaps to the nearer stretch', ({ x, time }) => {
      expect(timeAtX(x, EVENING_AND_MORNING, WIDTH)).toBe(time);
    });

    test.each([
      { touch: 'before the start', x: -10, time: 0 },
      { touch: 'past the end', x: WIDTH + 10, time: 360 * MINUTE },
    ])('then a touch $touch stays on the night', ({ x, time }) => {
      expect(timeAtX(x, EVENING_AND_MORNING, WIDTH)).toBe(time);
    });
  });
});

describe('hourStep', () => {
  describe('given a 6-hour night with room for every hour', () => {
    test('then it labels every hour', () => {
      expect(hourStep(singleStretch(6), 360)).toBe(1);
    });
  });

  describe('given an 11-hour night without room for every hour', () => {
    test.each([
      { width: 360, step: 2 },
      { width: 200, step: 3 },
    ])('then across $width points it labels every $step hours', ({ width, step }) => {
      expect(hourStep(singleStretch(11), width)).toBe(step);
    });
  });
});

describe('spacedOut', () => {
  describe('given marks with a close pair', () => {
    test('then it keeps marks at least the gap apart, dropping the later of the pair', () => {
      expect(spacedOut([0, 50, 80, 130, 200], (x) => x, 48)).toEqual([0, 50, 130, 200]);
    });
  });

  describe('given marks already far enough apart', () => {
    test('then it keeps everything', () => {
      expect(spacedOut([10, 60, 110], (x) => x, 40)).toEqual([10, 60, 110]);
    });
  });
});
