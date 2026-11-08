import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';

import type { Collection } from '@/domain/collection';
import { COLLECTION_SETS, type CollectionSet } from '@/domain/collectionSets';
import { RARITIES, type Rarity } from '@/domain/types';
import { colors, radius, rarityColors, spacing, typography } from '@/ui/theme';

import { CollectionCard } from './CollectionCard';
import { filterCollection, rows, type CollectionFilters } from './filterCollection';

const CARDS_PER_ROW = 3;

export type CollectionViewProps = {
  collection: Collection;
  filters: CollectionFilters;
  onSetFilter(set: CollectionSet | null): void;
  onRarityFilter(rarity: Rarity | null): void;
  onOpen(noradId: number): void;
};

function FilterChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        active && styles.chipActive,
        color !== undefined && { borderColor: color },
      ]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function CollectionView({
  collection,
  filters,
  onSetFilter,
  onRarityFilter,
  onOpen,
}: CollectionViewProps) {
  const { t } = useTranslation(['collection', 'common']);
  const sections = filterCollection(collection, filters).map((progress) => ({
    ...progress,
    data: rows(progress.cards, CARDS_PER_ROW),
  }));

  const header = (
    <View style={styles.header}>
      <Text style={styles.summary}>
        {t('summary', { caught: collection.caught, total: collection.total })}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        <FilterChip
          label={t('filters.all')}
          active={filters.set === null}
          onPress={() => onSetFilter(null)}
        />
        {COLLECTION_SETS.map((set) => (
          <FilterChip
            key={set}
            label={t(`sets.${set}`)}
            active={filters.set === set}
            onPress={() => onSetFilter(filters.set === set ? null : set)}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        <FilterChip
          label={t('filters.all')}
          active={filters.rarity === null}
          onPress={() => onRarityFilter(null)}
        />
        {RARITIES.map((rarity) => (
          <FilterChip
            key={rarity}
            label={t(`common:rarity.${rarity}`)}
            color={rarityColors[rarity]}
            active={filters.rarity === rarity}
            onPress={() => onRarityFilter(filters.rarity === rarity ? null : rarity)}
          />
        ))}
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
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {t(`sets.${section.id}`)}
            </Text>
            <Text style={styles.progressText}>
              {t('progress', { caught: section.caught, total: section.total })}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${(section.caught / section.total) * 100}%` }]}
            />
          </View>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={styles.row}>
          {item.map((card) => (
            <CollectionCard key={card.noradId} card={card} onOpen={onOpen} />
          ))}
          {Array.from({ length: CARDS_PER_ROW - item.length }, (_, index) => (
            <View key={`gap-${index}`} style={styles.gap} />
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
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summary: {
    ...typography.body,
    color: colors.textMuted,
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
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  gap: {
    flex: 1,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
});
