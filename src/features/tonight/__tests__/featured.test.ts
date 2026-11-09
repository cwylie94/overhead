import { featuredPass, matchesFilter, passScore, type RankedPass } from '../featured';

const MINUTE = 60_000;
const NOW = Date.UTC(2026, 10, 8, 20);

function pass(overrides: Partial<RankedPass & { id: number }> = {}) {
  return {
    id: 1,
    startAt: NOW + 60 * MINUTE,
    endAt: NOW + 65 * MINUTE,
    maxElevation: 40,
    peakMagnitude: 3.5,
    rarity: 'common' as const,
    ...overrides,
  };
}

const BRILLIANT_COMMON = pass({ peakMagnitude: -0.5, maxElevation: 20 });
const FAINTER_LEGENDARY = pass({ peakMagnitude: 2.5, maxElevation: 84, rarity: 'legendary' });
const BRIGHT_LOW = pass({ peakMagnitude: 1, maxElevation: 20 });
const FAINT_HIGH = pass({ peakMagnitude: 4, maxElevation: 85 });

const ONE_BRIGHTEST = [pass({ id: 1 }), pass({ id: 2, peakMagnitude: -1 }), pass({ id: 3 })];
const ABOUT_TO_START_AND_BETTER_LATER = [
  pass({ id: 1, startAt: NOW + 8 * MINUTE, endAt: NOW + 12 * MINUTE }),
  pass({ id: 2, peakMagnitude: -1 }),
];
const UNDER_WAY_AND_BETTER_ABOUT_TO_START = [
  pass({ id: 1, startAt: NOW - MINUTE, endAt: NOW + 3 * MINUTE }),
  pass({ id: 2, startAt: NOW + 5 * MINUTE, endAt: NOW + 9 * MINUTE, peakMagnitude: -1 }),
];
const BRIGHTEST_HAS_ENDED = [
  pass({ id: 1, startAt: NOW - 10 * MINUTE, endAt: NOW - 5 * MINUTE, peakMagnitude: -2 }),
  pass({ id: 2 }),
];

describe('passScore', () => {
  describe('given a pass and an otherwise identical one that differs in one way', () => {
    test.each([
      { difference: 'brighter', overrides: { peakMagnitude: 0 } },
      { difference: 'rarer', overrides: { rarity: 'rare' as const } },
      { difference: 'higher', overrides: { maxElevation: 80 } },
    ])('then the $difference pass scores higher', ({ overrides }) => {
      expect(passScore(pass(overrides))).toBeGreaterThan(passScore(pass()));
    });
  });

  describe('given a brilliant common pass and a fainter legendary one', () => {
    test('then the brilliant common pass scores higher', () => {
      expect(passScore(BRILLIANT_COMMON)).toBeGreaterThan(passScore(FAINTER_LEGENDARY));
    });
  });

  describe('given a bright low pass and a faint high one', () => {
    test('then brightness outweighs height', () => {
      expect(passScore(BRIGHT_LOW)).toBeGreaterThan(passScore(FAINT_HIGH));
    });
  });
});

describe('featuredPass', () => {
  describe('given a night where one pass is brighter than the rest', () => {
    test('then it features the best-scoring pass of the night', () => {
      expect(featuredPass(ONE_BRIGHTEST, NOW)).toEqual({ pass: ONE_BRIGHTEST[1], reason: 'best' });
    });
  });

  describe('given a pass about to start and a better one later', () => {
    test('then the pass about to start takes over', () => {
      expect(featuredPass(ABOUT_TO_START_AND_BETTER_LATER, NOW)).toEqual({
        pass: ABOUT_TO_START_AND_BETTER_LATER[0],
        reason: 'soon',
      });
    });
  });

  describe('given a pass under way and a better one about to start', () => {
    test('then the pass under way takes over', () => {
      expect(featuredPass(UNDER_WAY_AND_BETTER_ABOUT_TO_START, NOW)).toEqual({
        pass: UNDER_WAY_AND_BETTER_ABOUT_TO_START[0],
        reason: 'live',
      });
    });
  });

  describe('given the brightest pass of the night has ended', () => {
    test('then it features a pass that is still to come', () => {
      expect(featuredPass(BRIGHTEST_HAS_ENDED, NOW)?.pass).toBe(BRIGHTEST_HAS_ENDED[1]);
    });
  });

  describe('given no passes', () => {
    test('then it has nothing to feature', () => {
      expect(featuredPass([], NOW)).toBeNull();
    });
  });
});

describe('matchesFilter', () => {
  describe('given the worth-seeing filter', () => {
    test.each([
      { description: 'a bright low pass', candidate: pass({ peakMagnitude: 2, maxElevation: 15 }) },
      { description: 'a faint high pass', candidate: pass({ peakMagnitude: 4, maxElevation: 45 }) },
    ])('then it includes $description', ({ candidate }) => {
      expect(matchesFilter(candidate, 'worth')).toBe(true);
    });

    test.each([
      { description: 'a faint low pass', candidate: pass({ peakMagnitude: 4, maxElevation: 20 }) },
    ])('then it leaves out $description', ({ candidate }) => {
      expect(matchesFilter(candidate, 'worth')).toBe(false);
    });
  });

  describe('given the rare filter', () => {
    test.each([{ rarity: 'legendary' as const }, { rarity: 'rare' as const }])(
      'then it includes $rarity passes',
      ({ rarity }) => {
        expect(matchesFilter(pass({ rarity }), 'rare')).toBe(true);
      },
    );

    test.each([{ rarity: 'uncommon' as const }, { rarity: 'common' as const }])(
      'then it leaves out $rarity passes',
      ({ rarity }) => {
        expect(matchesFilter(pass({ rarity }), 'rare')).toBe(false);
      },
    );
  });

  describe('given the all filter', () => {
    test('then it includes even a faint low pass', () => {
      expect(matchesFilter(pass({ peakMagnitude: 4.4, maxElevation: 10 }), 'all')).toBe(true);
    });
  });
});
