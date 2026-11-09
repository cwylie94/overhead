import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/ui/Text';
import { colors, spacing, typography } from '@/ui/theme';

import { CatchButton } from './CatchButton';

type CatchMessageProps = {
  message: string;
  onDone(): void;
};

export function CatchMessage({ message, onDone }: CatchMessageProps) {
  const { t } = useTranslation('catch');
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.message}>{message}</Text>
      <CatchButton label={t('done')} onPress={onDone} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
  },
});
