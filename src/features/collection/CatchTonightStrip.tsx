import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { PassSummary } from '@/data/queries';
import { brightnessTier } from '@/domain/brightness';
import type { CatchTonight } from '@/domain/catchTonight';
import { catchWindow } from '@/domain/catchWindow';
import type { NightLabel } from '@/domain/nights';
import { ReminderButton, type ReminderControl } from '@/reminders/ReminderButton';
import { canRemind } from '@/reminders/reminders';
import type { Reminders } from '@/reminders/useReminders';
import { formatCountdown, formatNightDate, formatPassTime } from '@/translations/format';
import { Text } from '@/ui/Text';
import {
  brightnessMarkColors,
  colors,
  radius,
  rarityColors,
  spacing,
  typography,
} from '@/ui/theme';

type CatchTonightStripProps = {
  chances: CatchTonight<PassSummary>;
  reminders: Reminders | null;
  now: number;
  onPress(pass: PassSummary): void;
};

function useHeading(label: NightLabel): string {
  const { t, i18n } = useTranslation('collection');
  if (label.kind === 'later') {
    return t('chances.later', { night: formatNightDate(label.date, i18n.language) });
  }
  return t(`chances.${label.kind}`);
}

type ChanceProps = {
  pass: PassSummary;
  reminder: ReminderControl | null;
  now: number;
  onPress(): void;
};

function Chance({ pass, reminder, now, onPress }: ChanceProps) {
  const { t, i18n } = useTranslation(['collection', 'common']);
  const window = catchWindow(pass, now);
  const soon = window === 'live' || window === 'ready';
  const tier = pass.peakMagnitude === null ? 'faint' : brightnessTier(pass.peakMagnitude);
  const rarity = t(`common:rarity.${pass.rarity}`);
  const when =
    window === 'live'
      ? t('chances.live')
      : t('chances.when', {
          time: formatPassTime(pass.startAt, i18n.language),
          countdown: formatCountdown(pass.startAt, now, i18n.language),
        });

  return (
    <View style={[styles.chance, { borderColor: rarityColors[pass.rarity] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('chances.label', { name: pass.name, rarity, when })}
        testID={`chance-${pass.noradId}`}
        onPress={onPress}
        style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {pass.name}
        </Text>
        <Text style={[styles.when, soon && styles.soon]} numberOfLines={1}>
          {window === 'ready' ? `${t('chances.ready')} · ${when}` : when}
        </Text>
        <View style={styles.tags}>
          <Text style={[styles.tag, { color: rarityColors[pass.rarity] }]}>{rarity}</Text>
          <View style={[styles.dot, { backgroundColor: brightnessMarkColors[tier] }]} />
          <Text style={styles.brightness}>{t(`common:brightness.${tier}`)}</Text>
        </View>
      </Pressable>
      {reminder && <ReminderButton reminder={reminder} compact />}
    </View>
  );
}

export function CatchTonightStrip({ chances, reminders, now, onPress }: CatchTonightStripProps) {
  const { t } = useTranslation('collection');
  const heading = useHeading(chances.label);
  const reminderFor = (pass: PassSummary): ReminderControl | null =>
    reminders &&
    catchWindow(pass, now) === 'early' &&
    (reminders.isSet(pass) || canRemind(pass, now))
      ? { isSet: reminders.isSet(pass), onToggle: () => reminders.toggle(pass) }
      : null;

  return (
    <View style={styles.strip}>
      <View style={styles.headingRow}>
        <Text accessibilityRole="header" style={styles.heading}>
          {heading}
        </Text>
        <Text style={styles.count}>{t('chances.count', { count: chances.passes.length })}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chances}>
        {chances.passes.map((pass) => (
          <Chance
            key={pass.id}
            pass={pass}
            reminder={reminderFor(pass)}
            now={now}
            onPress={() => onPress(pass)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    gap: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  heading: {
    ...typography.heading,
    color: colors.text,
  },
  count: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chances: {
    gap: spacing.sm,
  },
  chance: {
    width: 184,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...typography.heading,
    fontSize: 15,
    color: colors.text,
  },
  when: {
    ...typography.caption,
    color: colors.textMuted,
  },
  soon: {
    color: colors.accent,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tag: {
    ...typography.label,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: spacing.xs,
  },
  brightness: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
