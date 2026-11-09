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

describe('passScore', () => {
  test('a brighter pass scores higher', () => {
    expect(passScore(pass({ peakMagnitude: 0 }))).toBeGreaterThan(passScore(pass()));
  });

  test('a rarer pass scores higher', () => {
    expect(passScore(pass({ rarity: 'rare' }))).toBeGreaterThan(passScore(pass()));
  });

  test('a higher pass scores higher', () => {
    expect(passScore(pass({ maxElevation: 80 }))).toBeGreaterThan(passScore(pass()));
  });

  test('brightness outweighs height', () => {
    const bright = pass({ peakMagnitude: 1, maxElevation: 20 });
    const high = pass({ peakMagnitude: 4, maxElevation: 85 });

    expect(passScore(bright)).toBeGreaterThan(passScore(high));
  });
});

describe('featuredPass', () => {
  test('picks the best-scoring pass of the night', () => {
    const passes = [pass({ id: 1 }), pass({ id: 2, peakMagnitude: -1 }), pass({ id: 3 })];

    expect(featuredPass(passes, NOW)).toEqual({ pass: passes[1], reason: 'best' });
  });

  test('a pass about to start takes over from a better one later', () => {
    const passes = [
      pass({ id: 1, startAt: NOW + 8 * MINUTE, endAt: NOW + 12 * MINUTE }),
      pass({ id: 2, peakMagnitude: -1 }),
    ];

    expect(featuredPass(passes, NOW)).toEqual({ pass: passes[0], reason: 'soon' });
  });

  test('a pass under way takes over from one about to start', () => {
    const passes = [
      pass({ id: 1, startAt: NOW - MINUTE, endAt: NOW + 3 * MINUTE }),
      pass({ id: 2, startAt: NOW + 5 * MINUTE, endAt: NOW + 9 * MINUTE, peakMagnitude: -1 }),
    ];

    expect(featuredPass(passes, NOW)).toEqual({ pass: passes[0], reason: 'live' });
  });

  test('never features a pass that has ended', () => {
    const passes = [
      pass({ id: 1, startAt: NOW - 10 * MINUTE, endAt: NOW - 5 * MINUTE, peakMagnitude: -2 }),
      pass({ id: 2 }),
    ];

    expect(featuredPass(passes, NOW)?.pass).toBe(passes[1]);
  });

  test('has nothing to feature without passes', () => {
    expect(featuredPass([], NOW)).toBeNull();
  });
});

describe('matchesFilter', () => {
  test.each([
    ['a bright low pass', pass({ peakMagnitude: 2, maxElevation: 15 }), true],
    ['a faint high pass', pass({ peakMagnitude: 4, maxElevation: 45 }), true],
    ['a faint low pass', pass({ peakMagnitude: 4, maxElevation: 20 }), false],
  ])('worth seeing includes %s: %s', (_, candidate, expected) => {
    expect(matchesFilter(candidate, 'worth')).toBe(expected);
  });

  test.each([
    ['legendary', true],
    ['rare', true],
    ['uncommon', false],
    ['common', false],
  ] as const)('rare includes %s passes: %s', (rarity, expected) => {
    expect(matchesFilter(pass({ rarity }), 'rare')).toBe(expected);
  });

  test('all includes everything', () => {
    expect(matchesFilter(pass({ peakMagnitude: 4.4, maxElevation: 10 }), 'all')).toBe(true);
  });
});
