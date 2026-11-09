import type { Rarity } from '@/domain/types';

import { catchTonight, type ChancePass } from '../catchTonight';

const local = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).getTime();

const MINUTE = 60_000;

function pass(noradId: number, startAt: number, overrides: Partial<ChancePass> = {}): ChancePass {
  return {
    noradId,
    rarity: 'common' as Rarity,
    startAt,
    endAt: startAt + 5 * MINUTE,
    maxElevation: 60,
    peakMagnitude: 2,
    ...overrides,
  };
}

const NONE_CAUGHT: ReadonlySet<number> = new Set();

describe('catchTonight', () => {
  const now = local(8, 18);

  test('lists uncaught satellites passing tonight, in time order', () => {
    const result = catchTonight(
      [pass(1, local(8, 20)), pass(2, local(8, 21)), pass(3, local(8, 22))],
      new Set([2]),
      now,
    );

    expect(result?.label).toEqual({ kind: 'tonight' });
    expect(result?.passes.map((chance) => chance.noradId)).toEqual([1, 3]);
  });

  test('keeps only the next pass of each satellite', () => {
    const result = catchTonight([pass(1, local(8, 20)), pass(1, local(8, 22))], NONE_CAUGHT, now);

    expect(result?.passes).toEqual([pass(1, local(8, 20))]);
  });

  test('skips passes that are over and faint passes low in the sky', () => {
    const result = catchTonight(
      [
        pass(1, local(8, 17)),
        pass(2, local(8, 20), { peakMagnitude: 4, maxElevation: 15 }),
        pass(3, local(8, 21), { peakMagnitude: 4, maxElevation: 45 }),
      ],
      NONE_CAUGHT,
      now,
    );

    expect(result?.passes.map((chance) => chance.noradId)).toEqual([3]);
  });

  test('looks ahead to the next night with chances', () => {
    const result = catchTonight([pass(1, local(9, 20)), pass(2, local(10, 20))], NONE_CAUGHT, now);

    expect(result?.label).toEqual({ kind: 'tomorrow' });
    expect(result?.passes.map((chance) => chance.noradId)).toEqual([1]);
  });

  test('is empty when everything passing is caught', () => {
    expect(catchTonight([pass(1, local(8, 20))], new Set([1]), now)).toBeNull();
  });
});
