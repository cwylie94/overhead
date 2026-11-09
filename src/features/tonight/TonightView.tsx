import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import type { UpcomingPass } from '@/data/queries';
import { brightnessTier } from '@/domain/brightness';
import type { LocationState } from '@/environment/location';
import { formatNightDate } from '@/i18n/format';
import { Banner } from '@/ui/Banner';
import { colors, radius, spacing, typography } from '@/ui/theme';

import { featuredPass, matchesFilter, PASS_FILTERS, type PassFilter } from './featured';
import { FeaturedPass } from './FeaturedPass';
import { groupByNight, nightNoon, type NightLabel } from './nights';
import { nightSky } from './nightSky';
import { NightTimeline } from './NightTimeline';
import { PassRow, type ReminderControl } from './PassRow';
import { canRemind } from './reminders';
import type { Reminders } from './useReminders';

const HIGHLIGHT_FOR = 2_500;
const RETRY_AFTER = 120;
const SETTLE = 50;

export type TonightViewProps = {
  location: LocationState;
  computing: boolean;
  stale: boolean;
  passes: UpcomingPass[];
  now: number;
  offline: boolean;
  staleDays: number | null;
  demoStartsAt: number | null;
  chosenLocation: { name: string; country: string } | null;
  reminders: Reminders | null;
  refreshing: boolean;
  onRefresh(): void;
  onAllowLocation(): void;
  onChooseCity(): void;
  onCatch(pass: UpcomingPass): void;
  onOpenSatellite(pass: UpcomingPass): void;
};

function Message({ text, hint }: { text: string; hint?: string }) {
  return (
    <View style={styles.message}>
      <Text style={styles.messageText}>{text}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

function useNightSky(latitude: number | null, longitude: number | null, night: string | null) {
  return useMemo(
    () =>
      latitude !== null && longitude !== null && night
        ? nightSky({ latitude, longitude, altitude: 0 }, nightNoon(night))
        : null,
    [latitude, longitude, night],
  );
}

type HeaderProps = {
  locationName: string;
  summary: string | null;
  onChooseCity(): void;
};

function Header({ locationName, summary, onChooseCity }: HeaderProps) {
  const { t } = useTranslation(['tonight', 'common']);
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('common:tabs.tonight')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t('location.change')}
          hitSlop={spacing.sm}
          onPress={onChooseCity}
          style={styles.location}>
          <Text style={styles.locationText} numberOfLines={1}>
            {locationName}
          </Text>
          <SymbolView name="chevron.down" size={12} tintColor={colors.textMuted} fallback={null} />
        </Pressable>
      </View>
      {summary && <Text style={styles.summary}>{summary}</Text>}
    </View>
  );
}

type FilterChipsProps = { selected: PassFilter; onSelect(filter: PassFilter): void };

function FilterChips({ selected, onSelect }: FilterChipsProps) {
  const { t } = useTranslation('tonight');
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('filters.label')}
      style={styles.chips}>
      {PASS_FILTERS.map((filter) => {
        const isSelected = filter === selected;
        return (
          <Pressable
            key={filter}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            hitSlop={spacing.xs}
            onPress={() => onSelect(filter)}
            style={[styles.chip, isSelected && styles.chipSelected]}>
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {t(`filters.${filter}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TonightView({
  location,
  computing,
  stale,
  passes,
  now,
  offline,
  staleDays,
  demoStartsAt,
  chosenLocation,
  reminders,
  refreshing,
  onRefresh,
  onAllowLocation,
  onChooseCity,
  onCatch,
  onOpenSatellite,
}: TonightViewProps) {
  const { t, i18n } = useTranslation(['tonight', 'common']);
  const [filter, setFilter] = useState<PassFilter>('worth');
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const scrollTarget = useRef<number | null>(null);
  const lastScroll = useRef<{
    sectionIndex: number;
    itemIndex: number;
    viewPosition: number;
  } | null>(null);
  const listRef = useRef<SectionList<UpcomingPass, { night: string; label: NightLabel }>>(null);

  const latitude = location.status === 'ready' ? location.observer.latitude : null;
  const longitude = location.status === 'ready' ? location.observer.longitude : null;
  const groups = stale ? [] : groupByNight(passes, now);
  const first = groups[0];
  const firstNight = first?.night ?? null;
  const sky = useNightSky(latitude, longitude, firstNight);
  const featured = first ? featuredPass(first.data, now) : null;
  const featuredId = featured?.pass.id ?? null;
  const listed = groups.map((group) => ({
    ...group,
    data: group.data.filter((pass) => pass.id !== featuredId),
  }));
  const sections = listed
    .map((group) => ({ ...group, data: group.data.filter((pass) => matchesFilter(pass, filter)) }))
    .filter((group) => group.data.length > 0);
  const hidden =
    listed.reduce((total, group) => total + group.data.length, 0) -
    sections.reduce((total, group) => total + group.data.length, 0);

  useEffect(() => {
    const target = scrollTarget.current;
    if (target === null) {
      return;
    }
    scrollTarget.current = null;
    const sectionIndex = sections.findIndex((section) =>
      section.data.some((pass) => pass.id === target),
    );
    if (sectionIndex >= 0) {
      const itemIndex = sections[sectionIndex]!.data.findIndex((pass) => pass.id === target);
      const location = { sectionIndex, itemIndex: itemIndex + 1, viewPosition: 0.4 };
      lastScroll.current = location;
      setTimeout(() => listRef.current?.scrollToLocation({ ...location, animated: true }), SETTLE);
    }
  });

  const retryScroll = ({
    averageItemLength,
    index,
  }: {
    averageItemLength: number;
    index: number;
  }) => {
    listRef.current
      ?.getScrollResponder()
      ?.scrollTo({ y: averageItemLength * index, animated: false });
    const location = lastScroll.current;
    if (location) {
      setTimeout(
        () => listRef.current?.scrollToLocation({ ...location, animated: true }),
        RETRY_AFTER,
      );
    }
  };

  useEffect(() => {
    if (highlighted === null) {
      return;
    }
    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_FOR);
    return () => clearTimeout(timer);
  }, [highlighted]);

  const nightTitle = (label: NightLabel) =>
    label.kind === 'later' ? formatNightDate(label.date, i18n.language) : t(`nights.${label.kind}`);

  const reminderFor = (pass: UpcomingPass): ReminderControl | null =>
    reminders && (reminders.isSet(pass) || canRemind(pass, now))
      ? { isSet: reminders.isSet(pass), onToggle: () => reminders.toggle(pass) }
      : null;

  const selectFromTimeline = (pass: UpcomingPass) => {
    if (pass.id === featuredId) {
      return;
    }
    if (!matchesFilter(pass, filter)) {
      setFilter('all');
    }
    setHighlighted(pass.id);
    scrollTarget.current = pass.id;
  };

  const brightCount =
    first?.data.filter(
      (pass) => pass.peakMagnitude !== null && brightnessTier(pass.peakMagnitude) !== 'faint',
    ).length ?? 0;
  const summary = first
    ? [
        t('summary', { count: first.data.length }),
        brightCount > 0 ? t('brightSummary', { count: brightCount }) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  const header = (
    <Header
      locationName={
        chosenLocation ? `${chosenLocation.name}, ${chosenLocation.country}` : t('location.current')
      }
      summary={summary}
      onChooseCity={onChooseCity}
    />
  );

  const banners = (
    <View>
      {demoStartsAt !== null && (
        <Banner
          message={t('common:banners.demo', { date: formatNightDate(demoStartsAt, i18n.language) })}
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
      <View>
        {header}
        <View style={styles.message}>
          <Text style={styles.messageText}>{t('states.locationDenied')}</Text>
          <Pressable accessibilityRole="button" style={styles.button} onPress={onAllowLocation}>
            <Text style={styles.buttonText}>
              {location.canAskAgain ? t('states.allowLocation') : t('states.openSettings')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={styles.secondaryButton}
            onPress={onChooseCity}>
            <Text style={styles.secondaryButtonText}>{t('states.chooseCity')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  if (location.status === 'locating') {
    return (
      <View>
        {header}
        <Message text={t('states.locating')} />
      </View>
    );
  }

  const showAll = (
    <Pressable
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={() => setFilter('all')}
      style={styles.showAll}>
      <Text style={styles.hint}>{t('filters.hidden', { count: hidden })}</Text>
      <Text style={styles.showAllText}>{t('filters.showAll')}</Text>
    </Pressable>
  );

  return (
    <SectionList
      ref={listRef}
      sections={sections}
      extraData={highlighted}
      keyExtractor={(pass) => String(pass.id)}
      renderItem={({ item }) => (
        <PassRow
          pass={item}
          highlighted={item.id === highlighted}
          onOpen={() => onOpenSatellite(item)}
          onCatch={() => onCatch(item)}
          reminder={reminderFor(item)}
        />
      )}
      onScrollToIndexFailed={retryScroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.textMuted}
        />
      }
      renderSectionHeader={({ section }) =>
        section.label.kind === 'tonight' ? null : (
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {nightTitle(section.label)}
          </Text>
        )
      }
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={styles.top}>
          {header}
          {banners}
          {first && (
            <NightTimeline
              sky={sky}
              passes={first.data}
              featuredId={featuredId}
              now={now}
              onSelect={selectFromTimeline}
            />
          )}
          {featured && first && (
            <FeaturedPass
              pass={featured.pass}
              reason={featured.reason}
              night={first.label}
              nightTitle={nightTitle(first.label)}
              reminder={reminderFor(featured.pass)}
              onOpen={() => onOpenSatellite(featured.pass)}
              onCatch={() => onCatch(featured.pass)}
            />
          )}
          {listed.some((group) => group.data.length > 0) && (
            <FilterChips selected={filter} onSelect={setFilter} />
          )}
        </View>
      }
      ListFooterComponent={sections.length > 0 && hidden > 0 ? showAll : undefined}
      ListEmptyComponent={
        hidden > 0 ? (
          <View style={styles.message}>
            <Text style={styles.messageText}>{t('filters.noneMatch')}</Text>
            {showAll}
          </View>
        ) : featured ? undefined : computing ? (
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
  top: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  headerText: {
    flexShrink: 1,
    gap: 2,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    ...typography.body,
    color: colors.textMuted,
    flexShrink: 1,
  },
  summary: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: 2,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipSelected: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.accent,
  },
  chipText: {
    ...typography.label,
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.accent,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  showAll: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  showAllText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent,
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
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.heading,
    color: colors.text,
  },
});
