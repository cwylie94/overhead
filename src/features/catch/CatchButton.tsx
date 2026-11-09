import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/ui/Text';
import { colors, radius, spacing, typography } from '@/ui/theme';

type CatchButtonProps = {
  label: string;
  onPress(): void;
};

export function CatchButton({ label, onPress }: CatchButtonProps) {
  return (
    <Pressable accessibilityRole="button" style={styles.button} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.heading,
    color: colors.text,
  },
});
