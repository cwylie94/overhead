import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';

import { useNeedsOnboarding } from '@/features/onboarding/useNeedsOnboarding';
import { colors } from '@/ui/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const onboarding = useNeedsOnboarding();

  if (onboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.surfaceRaised}
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index" testID="tab-tonight">
        <NativeTabs.Trigger.Label>{t('tabs.tonight')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="moon.stars" md="bedtime" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="sky" testID="tab-sky">
        <NativeTabs.Trigger.Label>{t('tabs.sky')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="scope" md="explore" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="collection" testID="tab-collection">
        <NativeTabs.Trigger.Label>{t('tabs.collection')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="grid_view" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings" testID="tab-settings">
        <NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
