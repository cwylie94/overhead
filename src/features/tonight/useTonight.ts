import { useNetInfo } from '@react-native-community/netinfo';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';

import { db } from '@/data/client';
import { usePassCache } from '@/data/passCache/PassCacheScheduler';
import { orbitFreshnessQuery, upcomingPassesQuery } from '@/data/queries';
import { useNow } from '@/environment/clock';
import { useLocation } from '@/environment/location';

import { staleDaysFor } from './staleness';
import type { TonightViewProps } from './TonightView';
import { useReminders } from './useReminders';

export function useTonight(): TonightViewProps {
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
    offline: net.isConnected === false,
    staleDays: staleDaysFor(
      freshness.map((group) => group.fetchedAt),
      now,
    ),
    reminders,
    refreshing,
    onRefresh: () => {
      setRefreshing(true);
      refresh()
        .catch(() => {})
        .finally(() => setRefreshing(false));
    },
    onAllowLocation: () => {
      location.requestPermission().catch(() => {});
    },
  };
}
