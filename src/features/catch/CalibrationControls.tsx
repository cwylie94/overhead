import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatCountdown } from '@/translations/format';
import { Text } from '@/ui/Text';
import { colors, radius, spacing, typography } from '@/ui/theme';

export type CalibrationControlsProps = {
  calibrating: boolean;
  moonUp: boolean;
  calibratedAt: number | null;
  tooFar: boolean;
  now: number;
  onStart(): void;
  onSet(): void;
  onCancel(): void;
};

export function CalibrationControls({
  calibrating,
  moonUp,
  calibratedAt,
  tooFar,
  now,
  onStart,
  onSet,
  onCancel,
}: CalibrationControlsProps) {
  const { t, i18n } = useTranslation('catch');

  if (calibrating) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>{t('moon.instructions')}</Text>
        {tooFar && <Text style={[styles.text, styles.warning]}>{t('moon.tooFar')}</Text>}
        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={onSet} style={styles.primary}>
            <Text style={styles.primaryText}>{t('moon.set')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondary}>
            <Text style={styles.secondaryText}>{t('moon.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {moonUp ? (
        <Pressable accessibilityRole="button" onPress={onStart} style={styles.secondary}>
          <Text style={styles.secondaryText}>{t('moon.start')}</Text>
        </Pressable>
      ) : (
        <Text style={styles.text}>{t('moon.down')}</Text>
      )}
      {calibratedAt !== null && (
        <Text style={styles.text}>
          {t('moon.calibrated', { time: formatCountdown(calibratedAt, now, i18n.language) })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  text: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  warning: {
    color: colors.warning,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primaryText: {
    ...typography.heading,
    color: colors.background,
  },
  secondary: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryText: {
    ...typography.heading,
    color: colors.text,
  },
});
