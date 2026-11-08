import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppData } from '@/data/AppDataContext';
import { collectableSatellitesQuery, sightingRecordsQuery } from '@/data/queries';
import { deriveCollection } from '@/domain/collection';
import { Screen } from '@/ui/Screen';

import { CollectionView } from './CollectionView';
import type { CollectionFilters } from './filterCollection';

export function CollectionScreen() {
  const { t } = useTranslation();
  const { db } = useAppData();
  const { data: satellites } = useLiveQuery(collectableSatellitesQuery(db));
  const { data: sightings } = useLiveQuery(sightingRecordsQuery(db));
  const [filters, setFilters] = useState<CollectionFilters>({ set: null, rarity: null });
  const collection = useMemo(
    () => deriveCollection(satellites, sightings),
    [satellites, sightings],
  );

  return (
    <Screen title={t('tabs.collection')}>
      <CollectionView
        collection={collection}
        filters={filters}
        onSetFilter={(set) => setFilters((current) => ({ ...current, set }))}
        onRarityFilter={(rarity) => setFilters((current) => ({ ...current, rarity }))}
        onOpen={(noradId) => router.push(`/satellite/${noradId}`)}
      />
    </Screen>
  );
}
