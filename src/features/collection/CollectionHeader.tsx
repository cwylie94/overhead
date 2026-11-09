import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Collection, RarityProgress } from '@/domain/collection';
import type { Rarity } from '@/domain/types';
import { colors, radius, rarityColors, spacing, typography } from '@/ui/theme';

type CollectionHeaderProps = {
  collection: Collection;
  rarity: Rarity | null;
  onRarityFilter(rarity: Rarity | null): void;
};

function fraction(caught: number, total: number): `${number}%` {
  return `${total === 0 ? 0 : (caught / total) * 100}%`;
}

function RarityMeter({
  progress,
  active,
  onPress,
}: {
  progress: RarityProgress;
  active: boolean;
  onPress(): void;
}) {
  const { t } = useTranslation(['collection', 'common']);
  const color = rarityColors[progress.id];
  const rarity = t(`common:rarity.${progress.id}`);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('rarityMeter', {
        rarity,
        caught: progress.caught,
        total: progress.total,
      })}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.meter,
        active && { borderColor: color, backgroundColor: colors.surfaceRaised },
      ]}>
      <Text style={[styles.meterLabel, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {rarity}
      </Text>
      <Text style={styles.meterValue}>
        {t('count', { caught: progress.caught, total: progress.total })}
      </Text>
      <View style={styles.meterTrack}>
        <View
          style={[
            styles.meterFill,
            { backgroundColor: color, width: fraction(progress.caught, progress.total) },
          ]}
        />
      </View>
    </Pressable>
  );
}

export function CollectionHeader({ collection, rarity, onRarityFilter }: CollectionHeaderProps) {
  const { t } = useTranslation('collection');

  return (
    <View style={styles.card}>
      <View
        accessible
        accessibilityLabel={t('summary', { caught: collection.caught, total: collection.total })}
        style={styles.summary}>
        <Text style={styles.caught}>{collection.caught}</Text>
        <Text style={styles.total}>{t('summaryTotal', { total: collection.total })}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: fraction(collection.caught, collection.total) }]} />
      </View>
      <View style={styles.meters}>
        {collection.rarities
          .filter((progress) => progress.total > 0)
          .map((progress) => (
            <RarityMeter
              key={progress.id}
              progress={progress}
              active={rarity === progress.id}
              onPress={() => onRarityFilter(rarity === progress.id ? null : progress.id)}
            />
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  caught: {
    ...typography.title,
    color: colors.text,
  },
  total: {
    ...typography.body,
    color: colors.textMuted,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    backgroundColor: colors.accent,
  },
  meters: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginHorizontal: -spacing.xs,
  },
  meter: {
    flex: 1,
    gap: 2,
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  meterLabel: {
    ...typography.label,
  },
  meterValue: {
    ...typography.caption,
    color: colors.text,
  },
  meterTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  meterFill: {
    height: 3,
  },
});
