import type { Rarity } from '@/domain/types';

import { catchTonight, type ChancePass } from '../catchTonight';

const local = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).getTime();

const MINUTE = 60_000;
const NOW = local(8, 18);

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
  describe('given three satellites passing tonight and the middle one caught', () => {
    const passes = [pass(1, local(8, 20)), pass(2, local(8, 21)), pass(3, local(8, 22))];
    const caught = new Set([2]);

    test('then it labels the chances as tonight', () => {
      expect(catchTonight(passes, caught, NOW)?.label).toEqual({ kind: 'tonight' });
    });

    test('then it lists the uncaught satellites in time order', () => {
      expect(catchTonight(passes, caught, NOW)?.passes.map((chance) => chance.noradId)).toEqual([
        1, 3,
      ]);
    });
  });

  describe('given a satellite that passes twice tonight', () => {
    const passes = [pass(1, local(8, 20)), pass(1, local(8, 22))];

    test('then it keeps only its next pass', () => {
      expect(catchTonight(passes, NONE_CAUGHT, NOW)?.passes).toEqual([pass(1, local(8, 20))]);
    });
  });

  describe('given a pass that is over, a faint pass low in the sky and a faint pass high in the sky', () => {
    const passes = [
      pass(1, local(8, 17)),
      pass(2, local(8, 20), { peakMagnitude: 4, maxElevation: 15 }),
      pass(3, local(8, 21), { peakMagnitude: 4, maxElevation: 45 }),
    ];

    test('then it keeps only the faint pass high in the sky', () => {
      expect(
        catchTonight(passes, NONE_CAUGHT, NOW)?.passes.map((chance) => chance.noradId),
      ).toEqual([3]);
    });
  });

  describe('given nothing passing tonight and passes on each of the next two nights', () => {
    const passes = [pass(1, local(9, 20)), pass(2, local(10, 20))];

    test('then it labels the chances as tomorrow', () => {
      expect(catchTonight(passes, NONE_CAUGHT, NOW)?.label).toEqual({ kind: 'tomorrow' });
    });

    test('then it lists only the next night’s passes', () => {
      expect(
        catchTonight(passes, NONE_CAUGHT, NOW)?.passes.map((chance) => chance.noradId),
      ).toEqual([1]);
    });
  });

  describe('given every satellite passing is caught', () => {
    test('then there is nothing to catch', () => {
      expect(catchTonight([pass(1, local(8, 20))], new Set([1]), NOW)).toBeNull();
    });
  });
});
