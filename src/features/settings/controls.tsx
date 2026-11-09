import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/ui/Text';
import { colors, radius, spacing, typography } from '@/ui/theme';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {children}
    </View>
  );
}

type RowProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  stacked?: boolean;
};

export function Row({ label, hint, children, stacked = false }: RowProps) {
  return (
    <View style={[styles.row, stacked && styles.stacked]}>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string };

type SegmentedProps<T extends string> = {
  label: string;
  options: readonly SegmentOption<T>[];
  selected: T;
  onSelect(value: T): void;
};

export function Segmented<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: SegmentedProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.segmented}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            onPress={() => onSelect(option.value)}
            style={[styles.segment, isSelected && styles.segmentSelected]}>
            <Text style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type StepperProps = {
  label: string;
  valueText: string;
  decreaseLabel: string;
  increaseLabel: string;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease(): void;
  onIncrease(): void;
};

export function Stepper({
  label,
  valueText,
  decreaseLabel,
  increaseLabel,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
}: StepperProps) {
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'increment' && canIncrease) {
          onIncrease();
        }
        if (nativeEvent.actionName === 'decrement' && canDecrease) {
          onDecrease();
        }
      }}
      style={styles.stepper}>
      <StepButton symbol="−" label={decreaseLabel} enabled={canDecrease} onPress={onDecrease} />
      <Text style={styles.stepValue}>{valueText}</Text>
      <StepButton symbol="+" label={increaseLabel} enabled={canIncrease} onPress={onIncrease} />
    </View>
  );
}

type StepButtonProps = { symbol: string; label: string; enabled: boolean; onPress(): void };

function StepButton({ symbol, label, enabled, onPress }: StepButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      hitSlop={spacing.sm}
      onPress={onPress}
      style={[styles.stepButton, !enabled && styles.disabled]}>
      <Text style={styles.stepSymbol}>{symbol}</Text>
    </Pressable>
  );
}

type ToggleProps = {
  label: string;
  value: boolean;
  testID?: string;
  onChange(value: boolean): void;
};

export function Toggle({ label, value, testID, onChange }: ToggleProps) {
  return (
    <Switch
      testID={testID}
      accessibilityLabel={label}
      value={value}
      onValueChange={onChange}
      trackColor={{ true: colors.accent, false: colors.border }}
      thumbColor={colors.text}
    />
  );
}

export const sectionStyles = StyleSheet.create({
  body: {
    ...typography.body,
    color: colors.text,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  buttonText: {
    ...typography.label,
    color: colors.background,
  },
});

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  rowText: {
    flexShrink: 1,
    flexGrow: 1,
    gap: 2,
  },
  label: {
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  segmentSelected: {
    backgroundColor: colors.surfaceRaised,
  },
  segmentText: {
    ...typography.label,
    color: colors.textMuted,
  },
  segmentTextSelected: {
    color: colors.accent,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  stepSymbol: {
    ...typography.heading,
    color: colors.text,
  },
  stepValue: {
    ...typography.body,
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  disabled: {
    opacity: 0.4,
  },
});
