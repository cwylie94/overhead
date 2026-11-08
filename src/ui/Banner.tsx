import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/ui/theme';

type BannerProps = {
  message: string;
  tone?: 'info' | 'warning';
};

export function Banner({ message, tone = 'info' }: BannerProps) {
  const warning = tone === 'warning';
  return (
    <View accessibilityRole="alert" style={[styles.banner, warning ? styles.warning : styles.info]}>
      <Text style={[styles.message, warning && styles.warningText]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  info: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  warning: {
    backgroundColor: colors.warningSurface,
    borderColor: colors.warning,
  },
  message: {
    ...typography.caption,
    color: colors.text,
  },
  warningText: {
    color: colors.warning,
  },
});
