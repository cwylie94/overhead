import type { Collection, CollectionCard } from '@/domain/collection';
import type { CollectionSet } from '@/domain/collectionSets';
import type { Rarity } from '@/domain/types';
import type { ChancePass } from '@/features/collection/catchTonight';
import { matchesFilter } from '@/features/tonight/featured';

export const NEXT_CATCH_WITHIN = 10 * 60_000;

export type CatchHeadline = 'caught' | 'legendary' | 'again' | 'setComplete';

export type SetProgress = {
  id: CollectionSet;
  before: number;
  after: number;
  total: number;
  number: number;
  cards: CollectionCard[];
};

export type CatchSummary<P> = {
  headline: CatchHeadline;
  isNew: boolean;
  count: number;
  firstCaughtAt: number;
  personalBest: { now: number; was: number } | null;
  set: SetProgress | null;
  next: P | null;
};

type CatchInput<P> = {
  noradId: number;
  rarity: Rarity;
  caughtAt: number;
  angleError: number;
  sightings: { observedAt: number; angleError: number | null }[];
  collection: Collection;
  passes: P[];
  now: number;
};

function setProgress(collection: Collection, noradId: number, isNew: boolean): SetProgress | null {
  for (const set of collection.sets) {
    const index = set.cards.findIndex((card) => card.noradId === noradId);
    if (index < 0) {
      continue;
    }
    const after = set.cards.filter(
      (card) => card.caughtAt !== null || card.noradId === noradId,
    ).length;
    return {
      id: set.id,
      before: isNew ? after - 1 : after,
      after,
      total: set.total,
      number: index + 1,
      cards: set.cards,
    };
  }
  return null;
}

function nextCatch<P extends ChancePass>(passes: P[], noradId: number, now: number): P | null {
  return (
    passes
      .filter(
        (pass) =>
          pass.noradId !== noradId &&
          pass.endAt > now &&
          pass.startAt <= now + NEXT_CATCH_WITHIN &&
          matchesFilter(pass, 'worth'),
      )
      .sort((a, b) => a.startAt - b.startAt)[0] ?? null
  );
}

export function summarizeCatch<P extends ChancePass>({
  noradId,
  rarity,
  caughtAt,
  angleError,
  sightings,
  collection,
  passes,
  now,
}: CatchInput<P>): CatchSummary<P> {
  const previous = sightings.filter((sighting) => sighting.observedAt < caughtAt);
  const isNew = previous.length === 0;
  const errors = previous.flatMap((sighting) =>
    sighting.angleError === null ? [] : [sighting.angleError],
  );
  const previousBest = errors.length === 0 ? null : Math.min(...errors);
  const set = setProgress(collection, noradId, isNew);
  const setComplete = isNew && set !== null && set.after === set.total;

  return {
    headline: setComplete
      ? 'setComplete'
      : !isNew
        ? 'again'
        : rarity === 'legendary'
          ? 'legendary'
          : 'caught',
    isNew,
    count: previous.length + 1,
    firstCaughtAt: isNew ? caughtAt : Math.min(...previous.map((sighting) => sighting.observedAt)),
    personalBest:
      previousBest !== null && angleError < previousBest
        ? { now: angleError, was: previousBest }
        : null,
    set,
    next: nextCatch(passes, noradId, now),
  };
}
