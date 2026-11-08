import type { Collection } from '@/domain/collection';
import type { CollectionSet } from '@/domain/collectionSets';
import type { Rarity } from '@/domain/types';

export type CollectionFilters = {
  set: CollectionSet | null;
  rarity: Rarity | null;
};

export function filterCollection(collection: Collection, { set, rarity }: CollectionFilters) {
  return collection.sets
    .filter((progress) => set === null || progress.id === set)
    .map((progress) => ({
      ...progress,
      cards: progress.cards.filter((card) => rarity === null || card.rarity === rarity),
    }))
    .filter((progress) => progress.cards.length > 0);
}

export function rows<T>(items: T[], perRow: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += perRow) {
    result.push(items.slice(index, index + perRow));
  }
  return result;
}
