import { useNetInfo } from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { useState } from 'react';

import { useAppData } from '@/data/AppDataContext';
import { useLiveQuery } from '@/data/liveQuery/useLiveQuery';
import { usePassCache } from '@/data/passCache/PassCacheScheduler';
import { orbitFreshnessQuery, upcomingPassesQuery } from '@/data/queries';
import { useDemo } from '@/demo/session';
import { useNow } from '@/environment/clock';
import { useLocation } from '@/environment/location';
import { useSettingsStore } from '@/stores/settingsStore';

import { staleDaysFor } from './staleness';
import type { TonightViewProps } from './TonightView';
import { useReminders } from './useReminders';

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
  const { data: passes } = useLiveQuery(upcomingPassesQuery(db, now), [now]);
  const { data: freshness } = useLiveQuery(orbitFreshnessQuery(db));

  return {
    location: location.state,
    computing: cache.status === 'computing',
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
    onChooseCity: () => router.push('/location'),
    onAllowLocation: () => {
      location.requestPermission().catch(() => {});
    },
  };
}
