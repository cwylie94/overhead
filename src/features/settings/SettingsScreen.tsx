import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { db } from '@/data/client';
import { pendingChangesQuery } from '@/data/queries';
import { useNow } from '@/environment/clock';
import { useSyncStore } from '@/stores/syncStore';
import { useSync } from '@/sync/SyncProvider';
import { Screen } from '@/ui/Screen';
import { spacing } from '@/ui/theme';

import { SyncSection } from './SyncSection';

export function usePendingChanges(): number {
  const { data } = useLiveQuery(pendingChangesQuery(db));
  return data[0]?.value ?? 0;
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const now = useNow(30_000);
  const { syncNow, configured } = useSync();
  const status = useSyncStore((sync) => sync.status);
  const lastSyncedAt = useSyncStore((sync) => sync.lastSyncedAt);
  const lastError = useSyncStore((sync) => sync.lastError);
  const pending = usePendingChanges();

  return (
    <Screen title={t('tabs.settings')}>
      <ScrollView contentContainerStyle={styles.content}>
        <SyncSection
          configured={configured}
          status={status}
          lastSyncedAt={lastSyncedAt}
          lastError={lastError}
          pending={pending}
          now={now}
          onSyncNow={() => {
            syncNow();
          }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl * 3,
  },
});
