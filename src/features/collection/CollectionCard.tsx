import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { CollectionCard as Card } from '@/domain/collection';
import { colors, radius, rarityColors, spacing, typography } from '@/ui/theme';

type CollectionCardProps = {
  card: Card;
  onOpen(noradId: number): void;
};

export function CollectionCard({ card, onOpen }: CollectionCardProps) {
  const { t } = useTranslation(['collection', 'common']);
  const caught = card.caughtAt !== null;
  const rarity = t(`common:rarity.${card.rarity}`);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caught ? `${card.name}, ${rarity}` : `${t('unknown')}, ${rarity}`}
      onPress={() => onOpen(card.noradId)}
      style={[
        styles.card,
        { borderColor: rarityColors[card.rarity] },
        !caught && styles.silhouette,
      ]}>
      {caught ? (
        <>
          <Text style={styles.name} numberOfLines={3}>
            {card.name}
          </Text>
          <Text style={[styles.rarity, { color: rarityColors[card.rarity] }]}>{rarity}</Text>
        </>
      ) : (
        <Text style={styles.unknown}>?</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 0.72,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  silhouette: {
    backgroundColor: colors.surface,
    opacity: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typography.label,
    color: colors.text,
  },
  rarity: {
    ...typography.label,
  },
  unknown: {
    ...typography.title,
    color: colors.textMuted,
  },
});
