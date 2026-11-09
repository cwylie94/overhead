import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { UpcomingPass } from '@/data/queries';
import { brightnessTier } from '@/domain/brightness';
import { catchWindow } from '@/domain/catchWindow';
import { compassPoint } from '@/domain/compass';
import { positionOnTrack } from '@/domain/sky';
import { useNow } from '@/environment/clock';
import { formatPassTime } from '@/translations/format';
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
import { ReminderButton, type ReminderControl } from './ReminderButton';
import { SkyGlyph } from './SkyGlyph';

const SOON = 60 * 60_000;
const LARGE_TEXT_SCALE = 1.3;

function usePathText(pass: UpcomingPass): string | null {
  const { t } = useTranslation(['tonight', 'common']);
  const start = positionOnTrack(pass.track, pass.startAt);
  const end = positionOnTrack(pass.track, pass.endAt);
  if (!start || !end) {
    return null;
  }
  return t('pathShort', {
    appears: t(`common:compass.${compassPoint(start.azimuth)}`),
    disappears: t(`common:compass.${compassPoint(end.azimuth)}`),
    degrees: Math.round(pass.maxElevation),
  });
}

type CatchButtonProps = { pass: UpcomingPass; wide?: boolean; onCatch(): void };

export function CatchButton({ pass, wide = false, onCatch }: CatchButtonProps) {
  const { t } = useTranslation('catch');
  const window = catchWindow(pass, useNow(1_000));
  if (window !== 'ready' && window !== 'live') {
    return null;
  }
  const live = window === 'live';
  return (
    <Pressable
      accessibilityRole="button"
      testID={`catch-${pass.noradId}`}
      hitSlop={spacing.sm}
      onPress={onCatch}
      style={[styles.action, styles.actionOn, wide && styles.actionWide]}>
      <Text style={[styles.actionText, styles.actionTextOn, wide && styles.actionTextWide]}>
        {live ? t('catch') : t('getReady')}
      </Text>
    </Pressable>
  );
}

type PassRowProps = {
  pass: UpcomingPass;
  reminder: ReminderControl | null;
  highlighted?: boolean;
  onOpen(): void;
  onCatch(): void;
};

export function PassRow({ pass, reminder, highlighted = false, onOpen, onCatch }: PassRowProps) {
  const { t, i18n } = useTranslation(['tonight', 'common']);
  const now = useNow(60_000);
  const path = usePathText(pass);
  const tier = pass.peakMagnitude === null ? 'faint' : brightnessTier(pass.peakMagnitude);
  const window = catchWindow(pass, now);
  const close = window !== 'early' || pass.startAt - now < SOON;
  const time = formatPassTime(pass.startAt, i18n.language);
  const largeText = useWindowDimensions().fontScale > LARGE_TEXT_SCALE;

  return (
    <View style={[styles.row, highlighted && styles.highlighted]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[pass.name, time, t(`common:brightness.${tier}`), path]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint={t('openSatellite')}
        onPress={onOpen}
        style={styles.main}>
        <Text style={styles.time}>{time}</Text>
        <View style={styles.text}>
          <View style={[styles.title, largeText && styles.titleWrapped]}>
            <Text style={styles.name} numberOfLines={1}>
              {pass.name}
            </Text>
            {pass.rarity !== 'common' && (
              <Text style={[styles.rarity, { color: rarityColors[pass.rarity] }]}>
                {t(`common:rarity.${pass.rarity}`)}
              </Text>
            )}
          </View>
          <Text style={styles.detail} numberOfLines={1}>
            {path}
            {close && (
              <>
                {' · '}
                <Countdown startAt={pass.startAt} endAt={pass.endAt} />
              </>
            )}
          </Text>
        </View>
        <SkyGlyph track={pass.track} startAt={pass.startAt} endAt={pass.endAt} size={28} />
        <View style={[styles.dot, { backgroundColor: brightnessMarkColors[tier] }]} />
      </Pressable>
      {window === 'ready' || window === 'live' ? (
        <CatchButton pass={pass} onCatch={onCatch} />
      ) : (
        reminder && <ReminderButton reminder={reminder} compact />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderRadius: radius.sm,
  },
  highlighted: {
    backgroundColor: colors.surfaceRaised,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: {
    ...typography.body,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    minWidth: 76,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  titleWrapped: {
    flexWrap: 'wrap',
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  rarity: {
    ...typography.label,
  },
  detail: {
    ...typography.caption,
    color: colors.textMuted,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  action: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionText: {
    ...typography.label,
    color: colors.text,
  },
  actionTextOn: {
    color: colors.background,
  },
  actionWide: {
    flexGrow: 1,
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  actionTextWide: {
    ...typography.heading,
    fontSize: 15,
    lineHeight: 20,
  },
});
