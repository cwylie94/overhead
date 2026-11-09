import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppData } from '@/data/AppDataContext';
import { useLiveQuery } from '@/data/liveQuery/useLiveQuery';
import { upcomingPassesQuery } from '@/data/queries';
import { useCollection } from '@/data/useCollection';
import { catchTonight } from '@/domain/catchTonight';
import { catchWindow } from '@/domain/catchWindow';
import { caughtIds } from '@/domain/collection';
import { useNow } from '@/environment/clock';
import { useReminders } from '@/reminders/useReminders';
import { Screen } from '@/ui/Screen';

import { CollectionView } from './CollectionView';
import type { CollectionFilters } from './filterCollection';

export function CollectionScreen() {
  const { t } = useTranslation();
  const { db } = useAppData();
  const now = useNow(60_000);
  const reminders = useReminders();
  const collection = useCollection();
  const { data: passes } = useLiveQuery(upcomingPassesQuery(db, now), [now]);
  const [filters, setFilters] = useState<CollectionFilters>({ set: null, rarity: null });
  const caught = useMemo(() => caughtIds(collection), [collection]);
  const chances = useMemo(() => catchTonight(passes, caught, now), [passes, caught, now]);

  return (
    <Screen title={t('tabs.collection')}>
      <CollectionView
        collection={collection}
        filters={filters}
        chances={chances}
        reminders={reminders}
        now={now}
        onSetFilter={(set) => setFilters((current) => ({ ...current, set }))}
        onRarityFilter={(rarity) => setFilters((current) => ({ ...current, rarity }))}
        onOpen={(noradId) => router.push(`/satellite/${noradId}`)}
        onChance={(pass) =>
          catchWindow(pass, now) === 'early'
            ? router.push(`/satellite/${pass.noradId}`)
            : router.push(`/catch/${pass.id}`)
        }
      />
    </Screen>
  );
}
