import { router } from 'expo-router';

import { useAppData } from '@/data/AppDataContext';
import { useLiveQuery } from '@/data/liveQuery/useLiveQuery';
import { satelliteSightingsQuery, upcomingPassesQuery, type UpcomingPass } from '@/data/queries';
import { useCollection } from '@/data/useCollection';

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
  const collection = useCollection();
  const { data: passes } = useLiveQuery(upcomingPassesQuery(db, now), [now]);
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
