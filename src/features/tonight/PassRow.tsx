import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { UpcomingPass } from '@/data/queries';
import { brightnessTier } from '@/domain/brightness';
import { compassPoint } from '@/domain/compass';
import { positionOnTrack } from '@/domain/sky';
import { useNow } from '@/environment/clock';
import { formatPassTime } from '@/i18n/format';
import { Chip } from '@/ui/Chip';
import { brightnessColors, colors, radius, rarityColors, spacing, typography } from '@/ui/theme';

import { Countdown } from './Countdown';

type PassRowProps = {
  pass: UpcomingPass;
  reminder: { isSet: boolean; onToggle(): void } | null;
  onCatch(): void;
};

function CatchButton({ pass, onCatch }: { pass: UpcomingPass; onCatch(): void }) {
  const { t } = useTranslation('catch');
  const now = useNow(1_000);
  if (now < pass.startAt || now >= pass.endAt) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="button"
      testID={`catch-${pass.noradId}`}
      hitSlop={spacing.sm}
      onPress={onCatch}
      style={[styles.remind, styles.remindSet]}>
      <Text style={[styles.remindText, styles.remindTextSet]}>{t('catch')}</Text>
    </Pressable>
  );
}

export function PassRow({ pass, reminder, onCatch }: PassRowProps) {
  const { t, i18n } = useTranslation(['tonight', 'common']);
  const start = positionOnTrack(pass.track, pass.startAt);
  const end = positionOnTrack(pass.track, pass.endAt);
  const tier = pass.peakMagnitude === null ? null : brightnessTier(pass.peakMagnitude);

  return (
    <View style={styles.row} accessible accessibilityLabel={pass.name}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {pass.name}
        </Text>
        {tier && <Chip label={t(`common:brightness.${tier}`)} color={brightnessColors[tier]} />}
      </View>
      <View style={styles.timing}>
        <Text style={styles.time}>{formatPassTime(pass.startAt, i18n.language)}</Text>
        <Countdown startAt={pass.startAt} endAt={pass.endAt} />
      </View>
      {start && end && (
        <Text style={styles.detail}>
          {t('path', {
            appears: t(`common:compass.${compassPoint(start.azimuth)}`),
            disappears: t(`common:compass.${compassPoint(end.azimuth)}`),
          })}
          {' · '}
          {t('maxElevation', { degrees: Math.round(pass.maxElevation) })}
        </Text>
      )}
      <View style={styles.footer}>
        <Chip label={t(`common:rarity.${pass.rarity}`)} color={rarityColors[pass.rarity]} />
        <CatchButton pass={pass} onCatch={onCatch} />
        {reminder && (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: reminder.isSet }}
            accessibilityLabel={t('reminder.add')}
            hitSlop={spacing.sm}
            onPress={reminder.onToggle}
            style={[styles.remind, reminder.isSet && styles.remindSet]}>
            <Text style={[styles.remindText, reminder.isSet && styles.remindTextSet]}>
              {reminder.isSet ? t('reminder.set') : t('reminder.add')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.heading,
    color: colors.text,
    flexShrink: 1,
  },
  timing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  time: {
    ...typography.body,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  detail: {
    ...typography.caption,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remind: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  remindSet: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  remindText: {
    ...typography.label,
    color: colors.text,
  },
  remindTextSet: {
    color: colors.background,
  },
});
