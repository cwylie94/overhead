import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import type { UpcomingPass } from '@/data/queries';
import type { Observer } from '@/domain/observer';
import type { LocationState } from '@/environment/location';
import { formatNightDate } from '@/i18n/format';
import { Banner } from '@/ui/Banner';
import { colors, radius, spacing, typography } from '@/ui/theme';

import { groupByNight, type NightLabel } from './nights';
import { PassRow } from './PassRow';
import { canRemind } from './reminders';
import type { Reminders } from './useReminders';

export type TonightViewProps = {
  location: LocationState;
  computing: boolean;
  passes: UpcomingPass[];
  now: number;
  offline: boolean;
  staleDays: number | null;
  demoStartsAt: number | null;
  testLocation: Observer | null;
  reminders: Reminders | null;
  refreshing: boolean;
  onRefresh(): void;
  onAllowLocation(): void;
  onCatch(pass: UpcomingPass): void;
};

function Message({ text, hint }: { text: string; hint?: string }) {
  return (
    <View style={styles.message}>
      <Text style={styles.messageText}>{text}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export function TonightView({
  location,
  computing,
  passes,
  now,
  offline,
  staleDays,
  demoStartsAt,
  testLocation,
  reminders,
  refreshing,
  onRefresh,
  onAllowLocation,
  onCatch,
}: TonightViewProps) {
  const { t, i18n } = useTranslation(['tonight', 'common']);

  const nightTitle = (label: NightLabel) =>
    label.kind === 'later' ? formatNightDate(label.date, i18n.language) : t(`nights.${label.kind}`);

  const banners = (
    <View>
      {demoStartsAt !== null && (
        <Banner
          message={t('common:banners.demo', { date: formatNightDate(demoStartsAt, i18n.language) })}
        />
      )}
      {testLocation && (
        <Banner
          tone="warning"
          message={t('common:banners.testLocation', {
            latitude: testLocation.latitude,
            longitude: testLocation.longitude,
          })}
        />
      )}
      {offline && <Banner message={t('common:banners.offline')} />}
      {staleDays !== null && (
        <Banner tone="warning" message={t('common:banners.stale', { count: staleDays })} />
      )}
    </View>
  );

  if (location.status === 'denied') {
    return (
      <View style={styles.message}>
        <Text style={styles.messageText}>{t('states.locationDenied')}</Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={onAllowLocation}>
          <Text style={styles.buttonText}>
            {location.canAskAgain ? t('states.allowLocation') : t('states.openSettings')}
          </Text>
        </Pressable>
      </View>
    );
  }
  if (location.status === 'locating') {
    return <Message text={t('states.locating')} />;
  }

  const sections = groupByNight(passes, now);
  const tonightCount =
    sections.find((section) => section.label.kind === 'tonight')?.data.length ?? 0;

  return (
    <SectionList
      sections={sections}
      keyExtractor={(pass) => String(pass.id)}
      renderItem={({ item }) => (
        <PassRow
          pass={item}
          onCatch={() => onCatch(item)}
          reminder={
            reminders && (reminders.isSet(item) || canRemind(item, now))
              ? { isSet: reminders.isSet(item), onToggle: () => reminders.toggle(item) }
              : null
          }
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.textMuted}
        />
      }
      renderSectionHeader={({ section }) => (
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {nightTitle(section.label)}
        </Text>
      )}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View>
          {banners}
          {sections.length > 0 && (
            <Text style={styles.summary}>{t('passCount', { count: tonightCount })}</Text>
          )}
        </View>
      }
      ListEmptyComponent={
        computing ? (
          <Message text={t('states.computing')} />
        ) : (
          <Message text={t('states.empty')} hint={t('states.emptyHint')} />
        )
      }
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl * 3,
  },
  summary: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  message: {
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonText: {
    ...typography.heading,
    color: colors.background,
  },
});
