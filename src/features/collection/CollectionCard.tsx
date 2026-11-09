import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CollectionCard as Card } from '@/domain/collection';
import { silhouetteFor } from '@/domain/silhouette';
import { formatShortDate } from '@/i18n/format';
import { CardFinish } from '@/ui/CardFinish';
import { SilhouetteArt } from '@/ui/SilhouetteArt';
import { Text } from '@/ui/Text';
import { colors, radius, rarityColors, spacing, typography } from '@/ui/theme';

export type CardNumber = { number: number; total: number };

type CollectionCardProps = {
  card: Card;
  position: CardNumber;
  onOpen(noradId: number): void;
};

const UNKNOWN_BORDER_ALPHA = '59';

export function CollectionCard({ card, position, onOpen }: CollectionCardProps) {
  const { t, i18n } = useTranslation(['collection', 'common']);
  const rarity = t(`common:rarity.${card.rarity}`);
  const color = rarityColors[card.rarity];
  const caught = card.caughtAt !== null;
  const number = t('cardNumber', position);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${caught ? card.name : t('unknown')}, ${rarity}, ${number}`}
      onPress={() => onOpen(card.noradId)}
      style={[
        styles.card,
        caught
          ? [styles.caught, { borderColor: color }, card.rarity === 'common' && styles.plain]
          : [styles.unknown, { borderColor: `${color}${UNKNOWN_BORDER_ALPHA}` }],
        caught && card.rarity === 'uncommon' && [styles.glow, { shadowColor: color }],
      ]}>
      <View style={[styles.art, !caught && styles.artUnknown]}>
        <SilhouetteArt
          silhouette={silhouetteFor(card)}
          color={caught ? color : colors.border}
          solid={!caught}
        />
        <Text style={[styles.small, styles.number]}>{number}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, !caught && styles.nameUnknown]} numberOfLines={2}>
          {caught ? card.name : '?'}
        </Text>
        <Text style={[styles.rarity, { color }]} numberOfLines={1}>
          {rarity}
        </Text>
        {card.caughtAt !== null && (
          <Text style={styles.small} numberOfLines={1}>
            {t('caughtOn', { date: formatShortDate(card.caughtAt, i18n.language) })}
          </Text>
        )}
      </View>
      {caught && <CardFinish rarity={card.rarity} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  caught: {
    borderWidth: 2,
    backgroundColor: colors.surfaceRaised,
  },
  plain: {
    borderWidth: 1.5,
  },
  glow: {
    overflow: 'visible',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  unknown: {
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  art: {
    flexBasis: '52%',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.md - 2,
    borderTopRightRadius: radius.md - 2,
  },
  artUnknown: {
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    padding: spacing.sm,
    gap: 2,
  },
  name: {
    ...typography.label,
    color: colors.text,
  },
  nameUnknown: {
    color: colors.textMuted,
  },
  rarity: {
    ...typography.label,
    marginTop: 'auto',
  },
  number: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.sm,
  },
  small: {
    fontSize: 10,
    lineHeight: 13,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
