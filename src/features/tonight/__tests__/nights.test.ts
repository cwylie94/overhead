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

describe('groupByNight in the morning', () => {
  const pass = (day: number, hour: number, minute = 0) => ({ startAt: local(day, hour, minute) });
  const labels = (passes: { startAt: number }[], now: number) =>
    groupByNight(passes, now).map((group) => group.label.kind);

  test('calls this evening tonight once last night is over', () => {
    expect(labels([pass(9, 19), pass(10, 20)], local(9, 9))).toEqual(['tonight', 'tomorrow']);
  });

  test('keeps last night as tonight while it still has passes to come', () => {
    expect(labels([pass(9, 5, 30), pass(9, 19)], local(9, 5))).toEqual(['tonight', 'tomorrow']);
  });

  test('moves on to this evening as soon as the last pass of the night is gone', () => {
    expect(labels([pass(9, 19), pass(10, 19)], local(9, 5, 45))).toEqual(['tonight', 'tomorrow']);
  });

  test('changes nothing in the afternoon and evening', () => {
    expect(labels([pass(9, 23), pass(10, 19)], local(9, 22))).toEqual(['tonight', 'tomorrow']);
  });
});
