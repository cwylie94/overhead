import { useNetInfo } from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { useState } from 'react';

import { useAppData } from '@/data/AppDataContext';
import { useLiveQuery } from '@/data/liveQuery/useLiveQuery';
import { orbitFreshnessQuery, upcomingPassesQuery } from '@/data/queries';
import { useNow } from '@/environment/clock';
import { useLocation } from '@/environment/location';
import { useReminders } from '@/reminders/useReminders';
import { useDemo } from '@/session/appSession';
import { usePassCache } from '@/session/PassCacheProvider';
import { useSettingsStore } from '@/stores/settingsStore';

import { passListProgress } from './passListProgress';
import { staleDaysFor } from './staleness';
import type { TonightViewProps } from './TonightView';

export function useTonight(): TonightViewProps {
  const { db } = useAppData();
  const demo = useDemo();
  const customLocation = useSettingsStore((settings) => settings.customLocation);
  const now = useNow(60_000);
  const location = useLocation();
  const { state: cache, refresh } = usePassCache();
  const reminders = useReminders();
  const [refreshing, setRefreshing] = useState(false);
  const net = useNetInfo();
  const { data: passes, loadedAt } = useLiveQuery(upcomingPassesQuery(db, now), [now]);
  const { data: freshness } = useLiveQuery(orbitFreshnessQuery(db));

  return {
    location: location.state,
    ...passListProgress(cache, loadedAt),
    passes,
    now,
    offline: demo === null && net.isConnected === false,
    staleDays: demo
      ? null
      : staleDaysFor(
          freshness.map((group) => group.fetchedAt),
          now,
        ),
    demoStartsAt: demo?.startsAt ?? null,
    chosenLocation: demo ? null : customLocation,
    reminders,
    refreshing,
    onRefresh: () => {
      setRefreshing(true);
      refresh()
        .catch(() => {})
        .finally(() => setRefreshing(false));
    },
    onCatch: (pass) => router.push(`/catch/${pass.id}`),
    onOpenSatellite: (pass) => router.push(`/satellite/${pass.noradId}`),
    onChooseCity: () => router.push('/location'),
    onAllowLocation: () => {
      location.requestPermission().catch(() => {});
    },
  };
}
