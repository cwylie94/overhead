import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon } from '@/ui/Icon';
import { colors, radius, spacing, typography } from '@/ui/theme';

export type ReminderControl = { isSet: boolean; onToggle(): void };

type ReminderButtonProps = { reminder: ReminderControl; compact?: boolean };

export function ReminderButton({ reminder, compact = false }: ReminderButtonProps) {
  const { t } = useTranslation('tonight');
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: reminder.isSet }}
      accessibilityLabel={t('reminder.add')}
      hitSlop={spacing.sm}
      onPress={reminder.onToggle}
      style={compact ? styles.bell : [styles.action, reminder.isSet && styles.actionOn]}>
      {compact ? (
        <Icon
          name={reminder.isSet ? 'bellOn' : 'bell'}
          size={18}
          tintColor={reminder.isSet ? colors.accent : colors.textMuted}
          fallback={<Text style={styles.actionText}>{reminder.isSet ? '●' : '○'}</Text>}
        />
      ) : (
        <Text style={[styles.actionText, reminder.isSet && styles.actionTextOn]}>
          {reminder.isSet ? t('reminder.set') : t('reminder.add')}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 28,
    alignItems: 'center',
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
});
