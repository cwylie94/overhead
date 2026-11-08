import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { useNow } from '@/environment/clock';
import { formatCountdown } from '@/i18n/format';
import { colors, typography } from '@/ui/theme';

type CountdownProps = {
  startAt: number;
  endAt: number;
};

export function Countdown({ startAt, endAt }: CountdownProps) {
  const { t, i18n } = useTranslation('tonight');
  const now = useNow(1_000);

  if (now >= endAt) {
    return <Text style={styles.text}>{t('justEnded')}</Text>;
  }
  if (now >= startAt) {
    return <Text style={[styles.text, styles.now]}>{t('visibleNow')}</Text>;
  }
  return <Text style={styles.text}>{formatCountdown(startAt, now, i18n.language)}</Text>;
}

const styles = StyleSheet.create({
  text: {
    ...typography.caption,
    color: colors.textMuted,
  },
  now: {
    color: colors.accent,
    fontWeight: '600',
  },
});
