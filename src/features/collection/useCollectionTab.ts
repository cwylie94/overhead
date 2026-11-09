import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { useAppData } from '@/data/AppDataContext';
import { useLiveQuery } from '@/data/liveQuery/useLiveQuery';
import { upcomingPassesQuery } from '@/data/queries';
import { useCollection } from '@/data/useCollection';
import { catchTonight } from '@/domain/catchTonight';
import { catchWindow } from '@/domain/catchWindow';
import { caughtIds } from '@/domain/collection';
import { useNow } from '@/environment/clock';
import { useReminders } from '@/reminders/useReminders';

import type { CollectionViewProps } from './CollectionView';
import type { CollectionFilters } from './filterCollection';

export function useCollectionTab(): CollectionViewProps {
  const { db } = useAppData();
  const now = useNow(60_000);
  const reminders = useReminders();
  const collection = useCollection();
  const { data: passes } = useLiveQuery(upcomingPassesQuery(db, now), [now]);
  const [filters, setFilters] = useState<CollectionFilters>({ set: null, rarity: null });
  const caught = useMemo(() => caughtIds(collection), [collection]);
  const chances = useMemo(() => catchTonight(passes, caught, now), [passes, caught, now]);

  return {
    collection,
    filters,
    chances,
    reminders,
    now,
    onSetFilter: (set) => setFilters((current) => ({ ...current, set })),
    onRarityFilter: (rarity) => setFilters((current) => ({ ...current, rarity })),
    onOpen: (noradId) => router.push(`/satellite/${noradId}`),
    onChance: (pass) =>
      catchWindow(pass, now) === 'early'
        ? router.push(`/satellite/${pass.noradId}`)
        : router.push(`/catch/${pass.id}`),
  };
}
