import { deriveCollection, type CollectableSatellite } from '@/domain/collection';

import { NEXT_CATCH_WITHIN, summarizeCatch } from '../catchSummary';

const NOW = Date.UTC(2026, 10, 9, 19);
const MINUTE = 60_000;

const satellites: CollectableSatellite[] = [
  {
    noradId: 25544,
    name: 'ISS (ZARYA)',
    objectType: 'payload',
    rarity: 'common',
    collectionSet: 'spaceStations',
  },
  {
    noradId: 48274,
    name: 'CSS (TIANHE)',
    objectType: 'payload',
    rarity: 'common',
    collectionSet: 'spaceStations',
  },
  {
    noradId: 3597,
    name: 'OAO 2',
    objectType: 'payload',
    rarity: 'legendary',
    collectionSet: 'observatories',
  },
  {
    noradId: 20580,
    name: 'HST',
    objectType: 'payload',
    rarity: 'rare',
    collectionSet: 'observatories',
  },
];

function pass(noradId: number, startsIn: number, peakMagnitude = 1) {
  return {
    id: noradId,
    noradId,
    rarity: 'common' as const,
    startAt: NOW + startsIn,
    endAt: NOW + startsIn + 5 * MINUTE,
    maxElevation: 50,
    peakMagnitude,
  };
}

function summarize(
  noradId: number,
  earlier: { observedAt: number; angleError: number | null }[],
  options: { angleError?: number; passes?: ReturnType<typeof pass>[] } = {},
) {
  const caughtAt = NOW;
  const angleError = options.angleError ?? 2;
  const sightings = [...earlier, { observedAt: caughtAt, angleError }];
  const collection = deriveCollection(satellites, [
    ...sightings.map(({ observedAt }) => ({ noradId, observedAt })),
    { noradId: 48274, observedAt: NOW - 1_000 },
  ]);
  const rarity = satellites.find((satellite) => satellite.noradId === noradId)!.rarity;
  return summarizeCatch({
    noradId,
    rarity,
    caughtAt,
    angleError,
    sightings,
    collection,
    passes: options.passes ?? [],
    now: NOW,
  });
}

describe('summarizeCatch', () => {
  describe('given a first catch', () => {
    test('then it is new', () => {
      expect(summarize(20580, [])).toMatchObject({
        headline: 'caught',
        isNew: true,
        count: 1,
        personalBest: null,
      });
    });

    test('then it moves its set on by one', () => {
      expect(summarize(20580, []).set).toMatchObject({
        id: 'observatories',
        before: 0,
        after: 1,
        total: 2,
      });
    });
  });

  describe('given a first Legendary catch', () => {
    test('then it gets its own headline', () => {
      expect(summarize(3597, []).headline).toBe('legendary');
    });
  });

  describe('given a catch of the last satellite missing from a set', () => {
    test('then it completes the set', () => {
      expect(summarize(25544, []).headline).toBe('setComplete');
    });

    test('then it moves the set on to full', () => {
      expect(summarize(25544, []).set).toMatchObject({ before: 1, after: 2, total: 2 });
    });
  });

  describe('given a third catch of the same satellite', () => {
    const earlier = [
      { observedAt: NOW - 3 * MINUTE, angleError: 2.4 },
      { observedAt: NOW - 9 * MINUTE, angleError: null },
    ];

    test('then it counts the catches and keeps the first date', () => {
      expect(summarize(20580, earlier)).toMatchObject({
        headline: 'again',
        isNew: false,
        count: 3,
        firstCaughtAt: NOW - 9 * MINUTE,
      });
    });

    test('then the set doesn’t move', () => {
      expect(summarize(20580, earlier).set).toMatchObject({ before: 1, after: 1 });
    });
  });

  describe('given a repeat catch aimed better than the earlier best', () => {
    test('then it notes a personal best', () => {
      const earlier = [{ observedAt: NOW - MINUTE, angleError: 2.4 }];

      expect(summarize(20580, earlier, { angleError: 0.9 }).personalBest).toEqual({
        now: 0.9,
        was: 2.4,
      });
    });
  });

  describe('given a repeat catch aimed worse than the earlier best', () => {
    test('then it notes no personal best', () => {
      const earlier = [{ observedAt: NOW - MINUTE, angleError: 2.4 }];

      expect(summarize(20580, earlier, { angleError: 3 }).personalBest).toBeNull();
    });
  });

  describe('given passes of the same satellite, a faint one, a late one and a worthwhile one', () => {
    test('then it offers the worthwhile pass of another satellite starting soon', () => {
      const passes = [
        pass(20580, 2 * MINUTE),
        pass(3597, NEXT_CATCH_WITHIN + MINUTE),
        pass(48274, 4 * MINUTE, 6),
        pass(25544, 3 * MINUTE),
      ];

      expect(summarize(20580, [], { passes }).next?.noradId).toBe(25544);
    });
  });

  describe('given only a pass that starts too late', () => {
    test('then it offers no next pass', () => {
      expect(
        summarize(20580, [], { passes: [pass(3597, NEXT_CATCH_WITHIN + MINUTE)] }).next,
      ).toBeNull();
    });
  });
});
