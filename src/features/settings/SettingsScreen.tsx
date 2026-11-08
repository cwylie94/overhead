import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { db } from '@/data/client';
import { pendingChangesQuery } from '@/data/queries';
import { useNow } from '@/environment/clock';
import { cancelAllReminders } from '@/features/tonight/reminders';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSyncStore } from '@/stores/syncStore';
import { useSync } from '@/sync/SyncProvider';
import { Screen } from '@/ui/Screen';
import { spacing } from '@/ui/theme';

import { AboutSection } from './AboutSection';
import { PreferencesSections, type PreferenceActions } from './PreferencesSections';
import { SyncSection } from './SyncSection';

const APP_VERSION = Constants.expoConfig?.version ?? '–';

export function usePendingChanges(): number {
  const { data } = useLiveQuery(pendingChangesQuery(db));
  return data[0]?.value ?? 0;
}

function usePreferences() {
  const preferences = useSettingsStore(
    useShallow(
      ({
        language,
        units,
        minElevation,
        notificationsEnabled,
        hapticsEnabled,
        motionPreference,
      }) => ({
        language,
        units,
        minElevation,
        notificationsEnabled,
        hapticsEnabled,
        motionPreference,
      }),
    ),
  );
  const store = useSettingsStore.getState();
  const actions: PreferenceActions = {
    setLanguage: store.setLanguage,
    setUnits: store.setUnits,
    setMinElevation: store.setMinElevation,
    setHapticsEnabled: store.setHapticsEnabled,
    setMotionPreference: store.setMotionPreference,
    setNotificationsEnabled: (enabled) => {
      store.setNotificationsEnabled(enabled);
      if (!enabled) {
        cancelAllReminders().catch(() => {});
      }
    },
  };
  return { preferences, actions };
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const now = useNow(30_000);
  const { syncNow, configured } = useSync();
  const status = useSyncStore((sync) => sync.status);
  const lastSyncedAt = useSyncStore((sync) => sync.lastSyncedAt);
  const lastError = useSyncStore((sync) => sync.lastError);
  const pending = usePendingChanges();
  const { preferences, actions } = usePreferences();

  return (
    <Screen title={t('tabs.settings')}>
      <ScrollView contentContainerStyle={styles.content}>
        <PreferencesSections preferences={preferences} actions={actions} />
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
        <AboutSection version={APP_VERSION} />
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
