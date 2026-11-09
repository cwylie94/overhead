import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppData } from '@/data/AppDataContext';
import { useLiveQuery } from '@/data/liveQuery/useLiveQuery';
import {
  collectableSatellitesQuery,
  orbitElementsQuery,
  sightingRecordsQuery,
  upcomingPassesQuery,
} from '@/data/queries';
import { catchWindow } from '@/domain/catchWindow';
import { deriveCollection } from '@/domain/collection';
import { dockingHosts } from '@/domain/docking';
import { useNow } from '@/environment/clock';
import { useReminders } from '@/features/tonight/useReminders';
import { Screen } from '@/ui/Screen';

import { catchTonight } from './catchTonight';
import { CollectionView } from './CollectionView';
import type { CollectionFilters } from './filterCollection';

export function CollectionScreen() {
  const { t } = useTranslation();
  const { db } = useAppData();
  const now = useNow(60_000);
  const reminders = useReminders();
  const { data: satellites } = useLiveQuery(collectableSatellitesQuery(db));
  const { data: sightings } = useLiveQuery(sightingRecordsQuery(db));
  const { data: elements } = useLiveQuery(orbitElementsQuery(db));
  const { data: passes } = useLiveQuery(upcomingPassesQuery(db, now), [now]);
  const docked = useMemo(
    () => new Set(dockingHosts(elements.map((row) => row.omm)).keys()),
    [elements],
  );
  const [filters, setFilters] = useState<CollectionFilters>({ set: null, rarity: null });
  const collection = useMemo(
    () => deriveCollection(satellites, sightings, docked),
    [satellites, sightings, docked],
  );
  const caught = useMemo(() => new Set(sightings.map((sighting) => sighting.noradId)), [sightings]);
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
