import { router } from 'expo-router';

import { useAppData } from '@/data/AppDataContext';
import { useLiveQuery } from '@/data/liveQuery/useLiveQuery';
import {
  nextPassQuery,
  satelliteOrbitQuery,
  satelliteQuery,
  satelliteSightingsQuery,
} from '@/data/queries';
import { useNow } from '@/environment/clock';
import { useSettingsStore } from '@/stores/settingsStore';

import type { SatelliteViewProps } from './SatelliteView';

export function useSatellite(noradId: number): SatelliteViewProps | null {
  const { db, repositories } = useAppData();
  const now = useNow(60_000);
  const units = useSettingsStore((settings) => settings.units);
  const { data: satellites } = useLiveQuery(satelliteQuery(db, noradId), [noradId]);
  const { data: orbits } = useLiveQuery(satelliteOrbitQuery(db, noradId), [noradId]);
  const orbit = orbits[0];
  const passesOf = orbit?.hostId ?? noradId;
  const { data: nextPasses } = useLiveQuery(nextPassQuery(db, passesOf, now), [passesOf, now]);
  const { data: sightings } = useLiveQuery(satelliteSightingsQuery(db, noradId), [noradId]);
  const satellite = satellites[0];

  if (!satellite) {
    return null;
  }
  return {
    satellite,
    orbit: orbit?.omm ?? null,
    hostName: orbit?.hostName ?? null,
    nextPassAt: nextPasses[0]?.startAt ?? null,
    sightings,
    units,
    onDeleteSighting: (id) => repositories.sightings.delete(id),
    onClose: () => router.back(),
  };
}
