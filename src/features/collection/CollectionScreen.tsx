import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppData } from '@/data/AppDataContext';
import { useLiveQuery } from '@/data/liveQuery/useLiveQuery';
import {
  collectableSatellitesQuery,
  orbitElementsQuery,
  sightingRecordsQuery,
} from '@/data/queries';
import { deriveCollection } from '@/domain/collection';
import { dockingHosts } from '@/domain/docking';
import { Screen } from '@/ui/Screen';

import { CollectionView } from './CollectionView';
import type { CollectionFilters } from './filterCollection';

export function CollectionScreen() {
  const { t } = useTranslation();
  const { db } = useAppData();
  const { data: satellites } = useLiveQuery(collectableSatellitesQuery(db));
  const { data: sightings } = useLiveQuery(sightingRecordsQuery(db));
  const { data: elements } = useLiveQuery(orbitElementsQuery(db));
  const docked = useMemo(
    () => new Set(dockingHosts(elements.map((row) => row.omm)).keys()),
    [elements],
  );
  const [filters, setFilters] = useState<CollectionFilters>({ set: null, rarity: null });
  const collection = useMemo(
    () => deriveCollection(satellites, sightings, docked),
    [satellites, sightings, docked],
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
