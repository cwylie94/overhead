import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CollectionCard as Card } from '@/domain/collection';
import { formatShortDate } from '@/i18n/format';
import { colors, radius, rarityColors, spacing, typography } from '@/ui/theme';

type CollectionCardProps = {
  card: Card;
  onOpen(noradId: number): void;
};

const UNKNOWN_BORDER_ALPHA = '59';

export function CollectionCard({ card, onOpen }: CollectionCardProps) {
  const { t, i18n } = useTranslation(['collection', 'common']);
  const rarity = t(`common:rarity.${card.rarity}`);
  const color = rarityColors[card.rarity];

  if (card.caughtAt === null) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('unknown')}, ${rarity}`}
        onPress={() => onOpen(card.noradId)}
        style={[styles.card, styles.unknown, { borderColor: `${color}${UNKNOWN_BORDER_ALPHA}` }]}>
        <Text style={[styles.mark, { color }]}>?</Text>
        <Text style={[styles.rarity, { color }]}>{rarity}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.name}, ${rarity}`}
      onPress={() => onOpen(card.noradId)}
      style={[styles.card, styles.caught, { borderColor: color }]}>
      <Text style={styles.name} numberOfLines={3}>
        {card.name}
      </Text>
      <View>
        <Text style={[styles.rarity, { color }]}>{rarity}</Text>
        <Text style={styles.date} numberOfLines={1}>
          {t('caughtOn', { date: formatShortDate(card.caughtAt, i18n.language) })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  caught: {
    borderWidth: 2,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'space-between',
  },
  unknown: {
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  name: {
    ...typography.label,
    color: colors.text,
  },
  rarity: {
    ...typography.label,
  },
  date: {
    ...typography.caption,
    color: colors.textMuted,
  },
  mark: {
    ...typography.title,
  },
});
