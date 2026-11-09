import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';

import type { Collection, CollectionSetProgress } from '@/domain/collection';
import type { CollectionSet } from '@/domain/collectionSets';
import type { Rarity } from '@/domain/types';
import { colors, radius, spacing, typography } from '@/ui/theme';

import type { CatchTonight } from './catchTonight';
import { CatchTonightStrip, type ChanceCard } from './CatchTonightStrip';
import { CollectionCard } from './CollectionCard';
import { CollectionHeader } from './CollectionHeader';
import { filterCollection, rows, type CollectionFilters } from './filterCollection';

const CARDS_PER_ROW = 3;

export type CollectionViewProps = {
  collection: Collection;
  filters: CollectionFilters;
  chances: CatchTonight<ChanceCard> | null;
  now: number;
  onSetFilter(set: CollectionSet | null): void;
  onRarityFilter(rarity: Rarity | null): void;
  onOpen(noradId: number): void;
  onChance(pass: ChanceCard): void;
};

function SetChip({
  label,
  count,
  accessibilityLabel,
  active,
  onPress,
}: {
  label: string;
  count?: string;
  accessibilityLabel?: string;
  active: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
        {count !== undefined && (
          <Text style={[styles.chipCount, active && styles.chipTextActive]}> {count}</Text>
        )}
      </Text>
    </Pressable>
  );
}

function setStatus(progress: CollectionSetProgress): 'complete' | 'oneToGo' | null {
  const left = progress.total - progress.caught;
  if (left === 0) {
    return 'complete';
  }
  return left === 1 && progress.total > 1 ? 'oneToGo' : null;
}

export function CollectionView({
  collection,
  filters,
  chances,
  now,
  onSetFilter,
  onRarityFilter,
  onOpen,
  onChance,
}: CollectionViewProps) {
  const { t } = useTranslation('collection');
  const sections = filterCollection(collection, filters).map((progress) => ({
    ...progress,
    data: rows(progress.cards, CARDS_PER_ROW),
  }));

  const header = (
    <View style={styles.header}>
      <CollectionHeader
        collection={collection}
        rarity={filters.rarity}
        onRarityFilter={onRarityFilter}
      />
      {chances && <CatchTonightStrip chances={chances} now={now} onPress={onChance} />}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        <SetChip
          label={t('filters.all')}
          active={filters.set === null}
          onPress={() => onSetFilter(null)}
        />
        {collection.sets.map((progress) => {
          const name = t(`sets.${progress.id}`);
          return (
            <SetChip
              key={progress.id}
              label={name}
              count={t('count', { caught: progress.caught, total: progress.total })}
              accessibilityLabel={t('setChip', {
                name,
                caught: progress.caught,
                total: progress.total,
              })}
              active={filters.set === progress.id}
              onPress={() => onSetFilter(filters.set === progress.id ? null : progress.id)}
            />
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(row) => row.map((card) => card.noradId).join('-')}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>{t('empty')}</Text>}
      renderSectionHeader={({ section }) => {
        const status = setStatus(section);
        const progress = t('progress', { caught: section.caught, total: section.total });
        return (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {t(`sets.${section.id}`)}
              </Text>
              <Text style={[styles.progressText, status !== null && styles.statusText]}>
                {status === null ? progress : `${progress} · ${t(`setStatus.${status}`)}`}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  status === 'complete' && styles.progressComplete,
                  { width: `${(section.caught / section.total) * 100}%` },
                ]}
              />
            </View>
          </View>
        );
      }}
      renderItem={({ item }) => (
        <View style={styles.row}>
          {item.map((card) => (
            <View key={card.noradId} style={styles.cell}>
              <CollectionCard card={card} onOpen={onOpen} />
            </View>
          ))}
          {Array.from({ length: CARDS_PER_ROW - item.length }, (_, index) => (
            <View key={`gap-${index}`} style={styles.cell} />
          ))}
        </View>
      )}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl * 3,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    ...typography.label,
    color: colors.text,
  },
  chipCount: {
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.background,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  progressText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statusText: {
    color: colors.success,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.accent,
  },
  progressComplete: {
    backgroundColor: colors.success,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cell: {
    flex: 1,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
});
