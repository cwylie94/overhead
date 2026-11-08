import { groupByNight, nightLabel, nightOf } from '../nights';

const local = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).getTime();

describe('nightOf', () => {
  test('a pass after midnight belongs to the night that began the evening before', () => {
    expect(nightOf(local(9, 1, 30))).toBe(nightOf(local(8, 21)));
  });

  test('the night changes at noon', () => {
    expect(nightOf(local(9, 11, 59))).toBe('2026-11-08');
    expect(nightOf(local(9, 12, 0))).toBe('2026-11-09');
  });
});

describe('nightLabel', () => {
  const now = local(8, 17);

  test.each([
    [local(8, 21), { kind: 'tonight' }],
    [local(9, 2), { kind: 'tonight' }],
    [local(9, 20), { kind: 'tomorrow' }],
    [local(10, 3), { kind: 'tomorrow' }],
  ])('labels %i relative to the evening of the 8th', (time, expected) => {
    expect(nightLabel(nightOf(time), now)).toEqual(expected);
  });

  test('later nights carry their evening date', () => {
    expect(nightLabel(nightOf(local(10, 21)), now)).toEqual({ kind: 'later', date: local(10, 18) });
  });

  test('after midnight, the night that is still going is tonight', () => {
    expect(nightLabel(nightOf(local(9, 3)), local(9, 2))).toEqual({ kind: 'tonight' });
  });
});

describe('groupByNight', () => {
  test('groups consecutive passes by night, keeping their order', () => {
    const passes = [local(8, 19), local(8, 23), local(9, 1), local(9, 19)].map((startAt) => ({
      startAt,
    }));

    const groups = groupByNight(passes, local(8, 17));

    expect(groups.map((group) => [group.label.kind, group.data.length])).toEqual([
      ['tonight', 3],
      ['tomorrow', 1],
    ]);
  });

  test('returns nothing for no passes', () => {
    expect(groupByNight([], local(8, 17))).toEqual([]);
  });
});
