import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { UpcomingPass } from '@/data/queries';
import { brightnessTier } from '@/domain/brightness';
import type { FeaturedReason } from '@/domain/featured';
import type { NightLabel } from '@/domain/nights';
import { useNow } from '@/environment/clock';
import { ReminderButton, type ReminderControl } from '@/reminders/ReminderButton';
import { formatCountdown, formatPassTime } from '@/translations/format';
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

import { LookDial } from './LookDial';
import { CatchButton } from './PassRow';
import { lookStage, whereToLook, type LookGuide } from './whereToLook';

const DIAL_SIZE = 72;

type FeaturedPassProps = {
  pass: UpcomingPass;
  reason: FeaturedReason;
  night: NightLabel;
  nightTitle: string;
  reminder: ReminderControl | null;
  onOpen(): void;
  onCatch(): void;
};

function useLookText(guide: LookGuide) {
  const { t } = useTranslation(['tonight', 'common']);
  const overhead = guide.height === 'overhead';
  const direction = t(`common:directions.${guide.direction}`);
  const toward = guide.toward && t(`common:directions.${guide.toward}`);
  const height = t(`look.height.${guide.height}`);
  const title = t(overhead ? `look.${guide.stage}Overhead` : `look.${guide.stage}`, { direction });

  if (guide.stage === 'over') {
    return { title, detail: overhead ? null : height };
  }
  const motion = guide.stage === 'live' ? 'moving' : 'heading';
  if (overhead) {
    return { title, detail: toward ? t(`look.${motion}Only`, { toward }) : null };
  }
  return { title, detail: toward ? t(`look.${motion}`, { height, toward }) : height };
}

function LookAt({ pass, guide }: { pass: UpcomingPass; guide: LookGuide }) {
  const { title, detail } = useLookText(guide);
  return (
    <View style={styles.look}>
      <LookDial
        track={pass.track}
        startAt={pass.startAt}
        endAt={pass.endAt}
        guide={guide}
        size={DIAL_SIZE}
      />
      <View style={styles.lookText}>
        <Text style={styles.lookTitle}>{title}</Text>
        {detail && <Text style={styles.lookDetail}>{detail}</Text>}
      </View>
    </View>
  );
}

function useTimingText(pass: UpcomingPass, now: number, stage: LookGuide['stage']) {
  const { t, i18n } = useTranslation('tonight');
  const time = formatPassTime(pass.startAt, i18n.language);
  if (stage === 'live') {
    return t('look.endsIn', { countdown: formatCountdown(pass.endAt, now, i18n.language) });
  }
  if (stage === 'over') {
    return time;
  }
  return `${time} · ${formatCountdown(pass.startAt, now, i18n.language)}`;
}

export function FeaturedPass({
  pass,
  reason,
  night,
  nightTitle,
  reminder,
  onOpen,
  onCatch,
}: FeaturedPassProps) {
  const { t } = useTranslation(['tonight', 'common']);
  const now = useNow(1_000);
  const tier = pass.peakMagnitude === null ? 'faint' : brightnessTier(pass.peakMagnitude);
  const guide = whereToLook(pass, now);
  const stage = lookStage(pass, now);
  const timing = useTimingText(pass, now, stage);
  const timely = reason !== 'best';
  const heading = timely
    ? t(stage === 'over' ? 'justEnded' : stage === 'live' ? 'featured.live' : 'featured.soon')
    : night.kind === 'later'
      ? t('featured.bestOn', { night: nightTitle })
      : t(`featured.best.${night.kind}`);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.heading, timely && stage !== 'over' && styles.headingLive]}>
          {heading}
        </Text>
        <View style={styles.chips}>
          <Chip label={t(`common:brightness.${tier}`)} color={brightnessMarkColors[tier]} />
          <Chip label={t(`common:rarity.${pass.rarity}`)} color={rarityColors[pass.rarity]} />
        </View>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {pass.name}
      </Text>
      {guide && <LookAt pass={pass} guide={guide} />}
      <Text style={styles.timing}>{timing}</Text>
      <View style={styles.actions}>
        <CatchButton pass={pass} wide onCatch={onCatch} />
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
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  heading: {
    ...typography.label,
    color: colors.textMuted,
  },
  headingLive: {
    color: colors.accent,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  name: {
    ...typography.heading,
    color: colors.text,
  },
  look: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  lookText: {
    flex: 1,
    gap: 2,
  },
  lookTitle: {
    ...typography.title,
    fontSize: 22,
    lineHeight: 27,
    color: colors.text,
  },
  lookDetail: {
    ...typography.caption,
    color: colors.textMuted,
  },
  timing: {
    ...typography.caption,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  details: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  detailsText: {
    ...typography.label,
    fontSize: 15,
    lineHeight: 20,
    color: colors.accent,
  },
});
