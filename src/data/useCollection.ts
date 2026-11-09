import { useMemo } from 'react';

import { deriveCollection, type Collection } from '@/domain/collection';

import { useAppData } from './AppDataContext';
import { useLiveQuery } from './liveQuery/useLiveQuery';
import { collectableSatellitesQuery, dockedObjectsQuery, sightingRecordsQuery } from './queries';

export function useCollection(): Collection {
  const { db } = useAppData();
  const { data: satellites } = useLiveQuery(collectableSatellitesQuery(db));
  const { data: sightings } = useLiveQuery(sightingRecordsQuery(db));
  const { data: docked } = useLiveQuery(dockedObjectsQuery(db));
  return useMemo(
    () => deriveCollection(satellites, sightings, new Set(docked.map((object) => object.noradId))),
    [satellites, sightings, docked],
  );
}
