import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/Text';
import { radius, spacing, typography } from '@/ui/theme';

type ChipProps = {
  label: string;
  color: string;
};

export function Chip({ label, color }: ChipProps) {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  label: {
    ...typography.label,
  },
});
