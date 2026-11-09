import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatCalendarDate, formatPassTime } from '@/i18n/format';
import { Text } from '@/ui/Text';
import { colors, radius, spacing, typography } from '@/ui/theme';

export type SightingListItem = {
  id: string;
  observedAt: number;
  angleError: number | null;
};

type SightingListProps = {
  sightings: SightingListItem[];
  onDelete(sighting: SightingListItem): void;
};

export function SightingList({ sightings, onDelete }: SightingListProps) {
  const { t, i18n } = useTranslation('collection');

  if (sightings.length === 0) {
    return null;
  }

  return (
    <View style={styles.list}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('detail.yourSightings')}
      </Text>
      {sightings.map((sighting) => {
        const when = `${formatCalendarDate(sighting.observedAt, i18n.language)}, ${formatPassTime(
          sighting.observedAt,
          i18n.language,
        )}`;
        const what =
          sighting.angleError === null
            ? t('detail.caught')
            : t('detail.caughtWithin', { degrees: sighting.angleError.toFixed(1) });
        return (
          <View key={sighting.id} style={styles.row}>
            <View style={styles.text}>
              <Text style={styles.when}>{when}</Text>
              <Text style={styles.what}>{what}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('detail.deleteSightingFrom', { when })}
              hitSlop={spacing.sm}
              onPress={() => onDelete(sighting)}
              style={styles.delete}>
              <Text style={styles.deleteText}>{t('detail.delete')}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    flex: 1,
  },
  when: {
    ...typography.body,
    color: colors.text,
  },
  what: {
    ...typography.caption,
    color: colors.textMuted,
  },
  delete: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deleteText: {
    ...typography.label,
    color: colors.warning,
  },
});
