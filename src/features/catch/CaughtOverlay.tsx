import { router } from 'expo-router';
import { useMemo } from 'react';

import { useAppData } from '@/data/AppDataContext';
import { useLiveQuery } from '@/data/liveQuery/useLiveQuery';
import {
  collectableSatellitesQuery,
  orbitElementsQuery,
  satelliteSightingsQuery,
  sightingRecordsQuery,
  upcomingPassesQuery,
  type UpcomingPass,
} from '@/data/queries';
import { deriveCollection } from '@/domain/collection';
import { dockingHosts } from '@/domain/docking';

import { summarizeCatch } from './catchSummary';
import { CaughtView } from './CaughtView';

type CaughtOverlayProps = {
  pass: UpcomingPass;
  caughtAt: number;
  angleError: number;
  now: number;
};

export function CaughtOverlay({ pass, caughtAt, angleError, now }: CaughtOverlayProps) {
  const { db } = useAppData();
  const { data: sightings } = useLiveQuery(satelliteSightingsQuery(db, pass.noradId), [
    pass.noradId,
  ]);
  const { data: satellites } = useLiveQuery(collectableSatellitesQuery(db));
  const { data: records } = useLiveQuery(sightingRecordsQuery(db));
  const { data: elements } = useLiveQuery(orbitElementsQuery(db));
  const { data: passes } = useLiveQuery(upcomingPassesQuery(db, now), [now]);
  const docked = useMemo(
    () => new Set(dockingHosts(elements.map((row) => row.omm)).keys()),
    [elements],
  );
  const collection = useMemo(
    () => deriveCollection(satellites, records, docked),
    [satellites, records, docked],
  );
  const summary = summarizeCatch({
    noradId: pass.noradId,
    rarity: pass.rarity,
    caughtAt,
    angleError,
    sightings,
    collection,
    passes,
    now,
  });

  return (
    <CaughtView
      noradId={pass.noradId}
      rarity={pass.rarity}
      maxElevation={pass.maxElevation}
      caughtAt={caughtAt}
      angleError={angleError}
      now={now}
      summary={summary}
      onViewCard={() => router.replace(`/satellite/${pass.noradId}`)}
      onDone={() => router.back()}
      onCatchNext={(next) => router.replace(`/catch/${next.id}`)}
    />
  );
}
