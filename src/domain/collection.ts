import { COLLECTION_SETS, type CollectionSet } from './collectionSets';
import { RARITIES, type ObjectType, type Rarity } from './types';

export type CollectableSatellite = {
  noradId: number;
  name: string;
  objectType: ObjectType;
  rarity: Rarity;
  collectionSet: CollectionSet;
};

export type SightingRecord = {
  noradId: number;
  observedAt: number;
};

export type CollectionCard = CollectableSatellite & {
  caughtAt: number | null;
  sightingCount: number;
};

export type CollectionSetProgress = {
  id: CollectionSet;
  cards: CollectionCard[];
  caught: number;
  total: number;
};

export type RarityProgress = {
  id: Rarity;
  caught: number;
  total: number;
};

export type Collection = {
  sets: CollectionSetProgress[];
  rarities: RarityProgress[];
  caught: number;
  total: number;
};

function byRarityThenName(a: CollectionCard, b: CollectionCard): number {
  return RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || a.name.localeCompare(b.name);
}

const NOTHING_DOCKED: ReadonlySet<number> = new Set();

export function deriveCollection(
  satellites: CollectableSatellite[],
  sightings: SightingRecord[],
  docked: ReadonlySet<number> = NOTHING_DOCKED,
): Collection {
  const firstCatch = new Map<number, number>();
  const sightingCounts = new Map<number, number>();

  for (const { noradId, observedAt } of sightings) {
    sightingCounts.set(noradId, (sightingCounts.get(noradId) ?? 0) + 1);
    const earliest = firstCatch.get(noradId);
    firstCatch.set(noradId, earliest === undefined ? observedAt : Math.min(earliest, observedAt));
  }

  const sets = COLLECTION_SETS.map((id): CollectionSetProgress => {
    const cards = satellites
      .filter((satellite) => satellite.collectionSet === id)
      .filter(
        (satellite) => !docked.has(satellite.noradId) || sightingCounts.has(satellite.noradId),
      )
      .map((satellite) => ({
        ...satellite,
        caughtAt: firstCatch.get(satellite.noradId) ?? null,
        sightingCount: sightingCounts.get(satellite.noradId) ?? 0,
      }))
      .sort(byRarityThenName);
    return {
      id,
      cards,
      caught: cards.filter((card) => card.caughtAt !== null).length,
      total: cards.length,
    };
  }).filter((set) => set.total > 0);

  const cards = sets.flatMap((set) => set.cards);
  const rarities = RARITIES.map((id): RarityProgress => {
    const ofRarity = cards.filter((card) => card.rarity === id);
    return {
      id,
      caught: ofRarity.filter((card) => card.caughtAt !== null).length,
      total: ofRarity.length,
    };
  });

  return {
    sets,
    rarities,
    caught: sets.reduce((sum, set) => sum + set.caught, 0),
    total: sets.reduce((sum, set) => sum + set.total, 0),
  };
}
