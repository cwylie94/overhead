import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { SkyPass } from '@/data/queries';
import { compassPoint } from '@/domain/compass';
import { positionOnTrack } from '@/domain/sky';
import { formatPassTime } from '@/i18n/format';
import { Chip } from '@/ui/Chip';
import { Text } from '@/ui/Text';
import { colors, radius, rarityColors, spacing, typography } from '@/ui/theme';

type SelectedSatelliteProps = {
  passes: SkyPass[];
  selectedId: number | null;
  time: number;
  live: boolean;
};

export function SelectedSatellite({ passes, selectedId, time, live }: SelectedSatelliteProps) {
  const { t, i18n } = useTranslation(['sky', 'common', 'catch']);
  const pass =
    passes.find((p) => p.noradId === selectedId && time >= p.startAt && time <= p.endAt) ??
    passes.find((p) => p.noradId === selectedId && p.endAt >= time);

  if (!pass) {
    return <Text style={styles.hint}>{t('hint')}</Text>;
  }

  const position =
    time >= pass.startAt && time <= pass.endAt ? positionOnTrack(pass.track, time) : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{pass.name}</Text>
        <Chip label={t(`common:rarity.${pass.rarity}`)} color={rarityColors[pass.rarity]} />
      </View>
      <Text style={styles.detail}>
        {position
          ? t('lookAt', {
              degrees: Math.round(position.elevation),
              direction: t(`common:compass.${compassPoint(position.azimuth)}`),
            })
          : t('notUp')}
      </Text>
      {live && position && (
        <Pressable
          accessibilityRole="button"
          style={styles.catch}
          onPress={() => router.push(`/catch/${pass.id}`)}>
          <Text style={styles.catchText}>{t('catch:catch')}</Text>
        </Pressable>
      )}
      <Text style={styles.detail}>
        {t('visibleBetween', {
          start: formatPassTime(pass.startAt, i18n.language),
          end: formatPassTime(pass.endAt, i18n.language),
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...typography.heading,
    color: colors.text,
  },
  detail: {
    ...typography.caption,
    color: colors.textMuted,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  catch: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginVertical: spacing.xs,
  },
  catchText: {
    ...typography.label,
    color: colors.background,
  },
});
