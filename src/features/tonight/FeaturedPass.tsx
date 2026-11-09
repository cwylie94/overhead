import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { UpcomingPass } from '@/data/queries';
import { brightnessTier } from '@/domain/brightness';
import { catchWindow } from '@/domain/catchWindow';
import { useNow } from '@/environment/clock';
import { formatPassTime } from '@/i18n/format';
import { Chip } from '@/ui/Chip';
import { Text } from '@/ui/Text';
import {
  brightnessMarkColors,
  colors,
  radius,
  rarityColors,
  spacing,
  typography,
} from '@/ui/theme';

import { Countdown } from './Countdown';
import type { FeaturedReason } from './featured';
import type { NightLabel } from './nights';
import { CatchButton, usePathText } from './PassRow';
import { ReminderButton, type ReminderControl } from './ReminderButton';
import { SkyGlyph } from './SkyGlyph';

const MINUTE = 60_000;

type FeaturedPassProps = {
  pass: UpcomingPass;
  reason: FeaturedReason;
  night: NightLabel;
  nightTitle: string;
  reminder: ReminderControl | null;
  onOpen(): void;
  onCatch(): void;
};

export function FeaturedPass({
  pass,
  reason,
  night,
  nightTitle,
  reminder,
  onOpen,
  onCatch,
}: FeaturedPassProps) {
  const { t, i18n } = useTranslation(['tonight', 'common']);
  const path = usePathText(pass);
  const tier = pass.peakMagnitude === null ? 'faint' : brightnessTier(pass.peakMagnitude);
  const minutes = Math.max(1, Math.round((pass.endAt - pass.startAt) / MINUTE));
  const now = useNow(1_000);
  const timely = reason !== 'best';
  const window = catchWindow(pass, now);
  const ended = timely && window === 'over';
  const heading = timely
    ? ended
      ? t('justEnded')
      : t(window === 'live' ? 'featured.live' : 'featured.soon')
    : night.kind === 'later'
      ? t('featured.bestOn', { night: nightTitle })
      : t(`featured.best.${night.kind}`);

  return (
    <View style={styles.card}>
      <SkyGlyph track={pass.track} startAt={pass.startAt} endAt={pass.endAt} size={84} />
      <View style={styles.body}>
        <Text style={[styles.heading, timely && !ended && styles.headingLive]}>{heading}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {pass.name}
        </Text>
        <Text style={styles.time}>
          {formatPassTime(pass.startAt, i18n.language)}
          {!ended && (
            <>
              {' · '}
              <Countdown startAt={pass.startAt} endAt={pass.endAt} />
            </>
          )}
        </Text>
        <View style={styles.chips}>
          <Chip label={t(`common:brightness.${tier}`)} color={brightnessMarkColors[tier]} />
          <Chip label={t(`common:rarity.${pass.rarity}`)} color={rarityColors[pass.rarity]} />
        </View>
        {path && (
          <Text style={styles.detail}>
            {path}
            {' · '}
            {t('featured.duration', { count: minutes })}
          </Text>
        )}
        <View style={styles.actions}>
          <CatchButton pass={pass} onCatch={onCatch} />
          {reason === 'best' && reminder && <ReminderButton reminder={reminder} />}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('featured.detailsFor', { name: pass.name })}
            hitSlop={spacing.sm}
            onPress={onOpen}
            style={styles.details}>
            <Text style={styles.detailsText}>{t('featured.details')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  heading: {
    ...typography.label,
    color: colors.textMuted,
  },
  headingLive: {
    color: colors.accent,
  },
  name: {
    ...typography.heading,
    fontSize: 20,
    lineHeight: 25,
    color: colors.text,
  },
  time: {
    ...typography.body,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detail: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  details: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  detailsText: {
    ...typography.label,
    color: colors.accent,
  },
});
