import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCountdown } from '@/i18n/format';
import type { SyncStatus } from '@/stores/syncStore';
import { colors, radius, spacing, typography } from '@/ui/theme';

export type SyncSectionProps = {
  configured: boolean;
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastError: string | null;
  pending: number;
  now: number;
  onSyncNow(): void;
};

export function SyncSection({
  configured,
  status,
  lastSyncedAt,
  lastError,
  pending,
  now,
  onSyncNow,
}: SyncSectionProps) {
  const { t, i18n } = useTranslation('settings');

  const statusLine =
    status === 'syncing'
      ? t('sync.syncing')
      : status === 'error' && lastError
        ? t('sync.failed', { message: lastError })
        : lastSyncedAt === null
          ? t('sync.never')
          : t('sync.lastSynced', { time: formatCountdown(lastSyncedAt, now, i18n.language) });

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('sync.title')}
      </Text>
      {configured ? (
        <>
          <Text style={styles.body}>
            {pending === 0 ? t('sync.upToDate') : t('sync.pending', { count: pending })}
          </Text>
          <Text style={[styles.caption, status === 'error' && styles.error]}>{statusLine}</Text>
        </>
      ) : (
        <Text style={styles.caption}>{t('sync.notConfigured')}</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: status === 'syncing' }}
        disabled={status === 'syncing'}
        onPress={onSyncNow}
        style={[styles.button, status === 'syncing' && styles.buttonBusy]}>
        <Text style={styles.buttonText}>{t('sync.syncNow')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.text,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
  },
  error: {
    color: colors.warning,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  buttonBusy: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.label,
    color: colors.background,
  },
});
