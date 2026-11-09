import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CollectionCard as Card } from '@/domain/collection';
import type { Rarity } from '@/domain/types';
import type { ChancePass } from '@/features/collection/catchTonight';
import { CollectionCard } from '@/features/collection/CollectionCard';
import { formatCountdown, formatPassTime } from '@/i18n/format';
import { HOLO_COLORS } from '@/ui/CardFinish';
import { Text } from '@/ui/Text';
import { colors, radius, rarityColors, spacing, typography } from '@/ui/theme';

import type { CatchHeadline, CatchSummary } from './catchSummary';
import { Burst, CardReveal, ProgressFill } from './CaughtEffects';

export type NextPass = ChancePass & { id: number; name: string };

export type CaughtViewProps = {
  noradId: number;
  rarity: Rarity;
  maxElevation: number;
  caughtAt: number;
  angleError: number;
  now: number;
  summary: CatchSummary<NextPass>;
  onViewCard(): void;
  onDone(): void;
  onCatchNext(pass: NextPass): void;
};

const FAN_SIZE = 3;
const FAN_TILT = [-8, 0, 8];

const HEADLINE_COLOR: Readonly<Record<CatchHeadline, string>> = {
  caught: colors.accent,
  again: colors.accent,
  legendary: rarityColors.legendary,
  setComplete: colors.success,
};

function burstColors(rarity: Rarity): readonly string[] | null {
  if (rarity === 'legendary') {
    return [rarityColors.legendary];
  }
  return rarity === 'rare' ? HOLO_COLORS : null;
}

function fanCards(cards: Card[], noradId: number): Card[] {
  const others = cards.filter((card) => card.noradId !== noradId).slice(0, FAN_SIZE - 1);
  const own = cards.find((card) => card.noradId === noradId);
  return own ? [others[0], own, others[1]].filter((card): card is Card => !!card) : others;
}

export function CaughtView({
  noradId,
  rarity,
  maxElevation,
  caughtAt,
  angleError,
  now,
  summary,
  onViewCard,
  onDone,
  onCatchNext,
}: CaughtViewProps) {
  const { t, i18n } = useTranslation(['catch', 'collection', 'common']);
  const leaving = useRef(false);
  const leaveOnce = (leave: () => void) => () => {
    if (leaving.current) {
      return;
    }
    leaving.current = true;
    leave();
  };
  const viewCard = leaveOnce(onViewCard);
  const done = leaveOnce(onDone);
  const { set, next, headline } = summary;
  const complete = headline === 'setComplete';
  const burst = summary.isNew ? burstColors(rarity) : null;
  const ownCard = set?.cards.find((card) => card.noradId === noradId);
  const card: Card | null = ownCard
    ? { ...ownCard, caughtAt: ownCard.caughtAt ?? summary.firstCaughtAt }
    : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.headline, { color: HEADLINE_COLOR[headline] }]}>
          {t(`caught.${headline}`)}
        </Text>
        {summary.isNew && !complete && (
          <View style={styles.newBadge}>
            <Text style={styles.newText}>{t('caught.new')}</Text>
          </View>
        )}

        <View style={styles.stage}>
          {burst && <Burst colors={burst} />}
          {complete && set ? (
            <View style={styles.fan}>
              {fanCards(set.cards, noradId).map((fanCard, index, all) => (
                <View
                  key={fanCard.noradId}
                  style={[
                    styles.fanCard,
                    {
                      transform: [
                        { rotate: `${FAN_TILT[all.length === 2 ? index * 2 : index]}deg` },
                      ],
                    },
                  ]}>
                  <CollectionCard
                    card={{ ...fanCard, caughtAt: fanCard.caughtAt ?? caughtAt }}
                    position={{
                      number: set.cards.indexOf(fanCard) + 1,
                      total: set.total,
                    }}
                    onOpen={viewCard}
                  />
                </View>
              ))}
            </View>
          ) : (
            card &&
            set && (
              <CardReveal>
                <View style={styles.card}>
                  <CollectionCard
                    card={card}
                    position={{ number: set.number, total: set.total }}
                    onOpen={viewCard}
                  />
                </View>
              </CardReveal>
            )
          )}
        </View>

        {!summary.isNew && (
          <View style={styles.centered}>
            <Text style={styles.count}>{t('caught.times', { count: summary.count })}</Text>
            {summary.personalBest && (
              <Text style={styles.best}>
                {t('caught.personalBest', {
                  now: summary.personalBest.now.toFixed(1),
                  was: summary.personalBest.was.toFixed(1),
                })}
              </Text>
            )}
          </View>
        )}

        {!complete && (
          <View style={styles.stats}>
            <Stat value={`${angleError.toFixed(1)}°`} label={t('caught.offTarget')} />
            <Stat value={formatPassTime(caughtAt, i18n.language)} label={t('caught.time')} />
            <Stat value={`${Math.round(maxElevation)}°`} label={t('caught.peak')} />
          </View>
        )}

        {set && (
          <View style={styles.progress}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressName}>{t(`collection:sets.${set.id}`)}</Text>
              <Text style={styles.progressCount}>
                {summary.isNew && !complete
                  ? t('caught.setStep', { before: set.before, after: set.after, total: set.total })
                  : t('caught.setCount', { caught: set.after, total: set.total })}
              </Text>
            </View>
            <View style={styles.track}>
              <ProgressFill
                from={set.before}
                to={set.after}
                total={set.total}
                color={complete ? colors.success : colors.accent}
              />
            </View>
          </View>
        )}

        {next && (
          <View style={styles.next}>
            <Text style={styles.nextWhen}>
              {next.startAt <= now
                ? t('caught.upNow')
                : t('caught.upNext', {
                    countdown: formatCountdown(next.startAt, now, i18n.language),
                  })}
            </Text>
            <View style={styles.nextName}>
              <Text style={styles.nextTitle} numberOfLines={1}>
                {next.name}
              </Text>
              <Text style={[styles.nextRarity, { color: rarityColors[next.rarity] }]}>
                {t(`common:rarity.${next.rarity}`)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        {next ? (
          <>
            <Button
              primary
              label={t('caught.catchNext', { name: next.name })}
              onPress={leaveOnce(() => onCatchNext(next))}
            />
            <Button label={t('done')} onPress={done} />
            <Pressable accessibilityRole="button" hitSlop={spacing.sm} onPress={viewCard}>
              <Text style={styles.link}>{t('caught.viewCard')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Button primary label={t('caught.viewCard')} onPress={viewCard} />
            <Button label={t('done')} onPress={done} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Button({
  label,
  primary = false,
  onPress,
}: {
  label: string;
  primary?: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        primary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}>
      <Text style={primary ? styles.primaryText : styles.secondaryText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 7, 13, 0.86)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  headline: {
    ...typography.title,
    textAlign: 'center',
  },
  newBadge: {
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  newText: {
    ...typography.label,
    color: colors.background,
    letterSpacing: 0.5,
  },
  stage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 230,
  },
  card: {
    width: 160,
  },
  fan: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  fanCard: {
    width: 110,
    marginHorizontal: -spacing.sm,
  },
  centered: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  count: {
    ...typography.heading,
    color: colors.text,
  },
  best: {
    ...typography.caption,
    color: colors.success,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  statValue: {
    ...typography.heading,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  progress: {
    width: '100%',
    gap: spacing.xs,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressName: {
    ...typography.caption,
    color: colors.textMuted,
  },
  progressCount: {
    ...typography.caption,
    color: colors.text,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  next: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  nextWhen: {
    ...typography.caption,
    color: colors.textMuted,
  },
  nextName: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  nextTitle: {
    ...typography.heading,
    color: colors.text,
    flexShrink: 1,
  },
  nextRarity: {
    ...typography.label,
  },
  actions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  primary: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: spacing.sm + spacing.xs,
    alignItems: 'center',
  },
  primaryText: {
    ...typography.heading,
    color: colors.accent,
  },
  secondary: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + spacing.xs,
    alignItems: 'center',
  },
  secondaryText: {
    ...typography.heading,
    color: colors.text,
  },
  pressed: {
    opacity: 0.7,
  },
  link: {
    ...typography.heading,
    color: colors.accent,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
});
