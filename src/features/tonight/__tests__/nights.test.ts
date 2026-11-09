import { groupByNight, nightLabel, nightNoon, nightOf } from '../nights';

const local = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).getTime();
const passAt = (day: number, hour: number, minute = 0) => ({ startAt: local(day, hour, minute) });
const labels = (passes: { startAt: number }[], now: number) =>
  groupByNight(passes, now).map((group) => group.label.kind);

describe('nightOf', () => {
  describe('given a pass after midnight', () => {
    test('then it belongs to the night that began the evening before', () => {
      expect(nightOf(local(9, 1, 30))).toBe(nightOf(local(8, 21)));
    });
  });

  describe('given times either side of noon on the 9th', () => {
    test.each([
      { time: '11:59', at: local(9, 11, 59), night: '2026-11-08' },
      { time: '12:00', at: local(9, 12, 0), night: '2026-11-09' },
    ])('then $time belongs to the night of $night', ({ at, night }) => {
      expect(nightOf(at)).toBe(night);
    });
  });
});

describe('nightNoon', () => {
  describe('given the night that began on the 8th', () => {
    test('then it is midday on the 8th', () => {
      expect(nightNoon(nightOf(local(9, 1, 30)))).toBe(local(8, 12));
    });
  });
});

describe('nightLabel', () => {
  describe('given it is the evening of the 8th', () => {
    const now = local(8, 17);

    test.each([
      { time: '9 PM on the 8th', at: local(8, 21), expected: { kind: 'tonight' } },
      { time: '2 AM on the 9th', at: local(9, 2), expected: { kind: 'tonight' } },
      { time: '8 PM on the 9th', at: local(9, 20), expected: { kind: 'tomorrow' } },
      { time: '3 AM on the 10th', at: local(10, 3), expected: { kind: 'tomorrow' } },
    ])('then the night of $time is $expected.kind', ({ at, expected }) => {
      expect(nightLabel(nightOf(at), now)).toEqual(expected);
    });

    test('then a later night carries its evening date', () => {
      expect(nightLabel(nightOf(local(10, 21)), now)).toEqual({
        kind: 'later',
        date: local(10, 18),
      });
    });
  });

  describe('given it is after midnight', () => {
    test('then the night that is still going is tonight', () => {
      expect(nightLabel(nightOf(local(9, 3)), local(9, 2))).toEqual({ kind: 'tonight' });
    });
  });
});

describe('groupByNight', () => {
  describe('given passes across two nights', () => {
    const passes = [passAt(8, 19), passAt(8, 23), passAt(9, 1), passAt(9, 19)];

    test('then it groups consecutive passes by night, keeping their order', () => {
      const groups = groupByNight(passes, local(8, 17));

      expect(groups.map((group) => [group.label.kind, group.data.length])).toEqual([
        ['tonight', 3],
        ['tomorrow', 1],
      ]);
    });
  });

  describe('given no passes', () => {
    test('then it returns nothing', () => {
      expect(groupByNight([], local(8, 17))).toEqual([]);
    });
  });

  describe('given it is morning and last night is over', () => {
    test('then this evening is tonight', () => {
      expect(labels([passAt(9, 19), passAt(10, 20)], local(9, 9))).toEqual(['tonight', 'tomorrow']);
    });
  });

  describe('given it is morning and last night still has passes to come', () => {
    test('then last night is still tonight', () => {
      expect(labels([passAt(9, 5, 30), passAt(9, 19)], local(9, 5))).toEqual([
        'tonight',
        'tomorrow',
      ]);
    });
  });

  describe('given it is morning and the last pass of the night has just gone', () => {
    test('then it moves on to this evening', () => {
      expect(labels([passAt(9, 19), passAt(10, 19)], local(9, 5, 45))).toEqual([
        'tonight',
        'tomorrow',
      ]);
    });
  });

  describe('given it is evening', () => {
    test('then the morning rule changes nothing', () => {
      expect(labels([passAt(9, 23), passAt(10, 19)], local(9, 22))).toEqual([
        'tonight',
        'tomorrow',
      ]);
    });
  });
});
