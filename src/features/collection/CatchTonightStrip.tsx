import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { brightnessTier } from '@/domain/brightness';
import { catchWindow } from '@/domain/catchWindow';
import type { NightLabel } from '@/features/tonight/nights';
import { formatCountdown, formatNightDate, formatPassTime } from '@/i18n/format';
import {
  brightnessMarkColors,
  colors,
  radius,
  rarityColors,
  spacing,
  typography,
} from '@/ui/theme';

import type { CatchTonight, ChancePass } from './catchTonight';

export type ChanceCard = ChancePass & { id: number; name: string };

type CatchTonightStripProps = {
  chances: CatchTonight<ChanceCard>;
  now: number;
  onPress(pass: ChanceCard): void;
};

function useHeading(label: NightLabel): string {
  const { t, i18n } = useTranslation('collection');
  if (label.kind === 'later') {
    return t('chances.later', { night: formatNightDate(label.date, i18n.language) });
  }
  return t(`chances.${label.kind}`);
}

function Chance({ pass, now, onPress }: { pass: ChanceCard; now: number; onPress(): void }) {
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('chances.label', { name: pass.name, rarity, when })}
      testID={`chance-${pass.noradId}`}
      onPress={onPress}
      style={[styles.chance, { borderColor: rarityColors[pass.rarity] }]}>
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
  );
}

export function CatchTonightStrip({ chances, now, onPress }: CatchTonightStripProps) {
  const { t } = useTranslation('collection');
  const heading = useHeading(chances.label);

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
          <Chance key={pass.id} pass={pass} now={now} onPress={() => onPress(pass)} />
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
    width: 168,
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
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
