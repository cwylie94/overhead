import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useAppData } from '@/data/AppDataContext';
import { useLiveQuery } from '@/data/liveQuery/useLiveQuery';
import { orbitFreshnessQuery } from '@/data/queries';
import { useNow } from '@/environment/clock';
import { cancelAllReminders } from '@/reminders/reminders';
import { useDemo } from '@/session/appSession';
import { useOrbitRefreshStore } from '@/stores/orbitRefreshStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Screen } from '@/ui/Screen';
import { spacing } from '@/ui/theme';

import { AboutSection } from './AboutSection';
import { DemoSection } from './DemoSection';
import { LocationSection } from './LocationSection';
import { OrbitDataSection } from './OrbitDataSection';
import { PreferencesSections, type PreferenceActions } from './PreferencesSections';

const APP_VERSION = Constants.expoConfig?.version ?? '–';

function useOrbitsUpdatedAt(): number | null {
  const { db } = useAppData();
  const { data } = useLiveQuery(orbitFreshnessQuery(db));
  const times = data.flatMap((group) => (group.fetchedAt === null ? [] : [group.fetchedAt]));
  return times.length === 0 ? null : Math.min(...times);
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
  const refreshStatus = useOrbitRefreshStore((refresh) => refresh.status);
  const orbitsUpdatedAt = useOrbitsUpdatedAt();
  const { preferences, actions } = usePreferences();
  const demo = useDemo();
  const setDemoMode = useSettingsStore((settings) => settings.setDemoMode);
  const setOnboardingComplete = useSettingsStore((settings) => settings.setOnboardingComplete);
  const customLocation = useSettingsStore((settings) => settings.customLocation);
  const setCustomLocation = useSettingsStore((settings) => settings.setCustomLocation);

  return (
    <Screen title={t('tabs.settings')}>
      <ScrollView contentContainerStyle={styles.content}>
        <LocationSection
          customLocation={customLocation}
          onChooseCity={() => router.push('/location')}
          onUseGps={() => setCustomLocation(null)}
        />
        <PreferencesSections preferences={preferences} actions={actions} />
        {demo === null && (
          <OrbitDataSection updatedAt={orbitsUpdatedAt} status={refreshStatus} now={now} />
        )}
        <DemoSection startsAt={demo?.startsAt ?? null} onChange={setDemoMode} />
        <AboutSection
          version={APP_VERSION}
          onToggleDemo={() => setDemoMode(demo === null)}
          onReplayIntro={() => {
            setDemoMode(false);
            setOnboardingComplete(false);
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
