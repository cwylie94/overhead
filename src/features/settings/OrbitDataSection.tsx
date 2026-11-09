import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { formatCountdown } from '@/i18n/format';
import type { RefreshStatus } from '@/stores/orbitRefreshStore';
import { colors } from '@/ui/theme';

import { Section, sectionStyles } from './controls';

export type OrbitDataSectionProps = {
  updatedAt: number | null;
  status: RefreshStatus;
  now: number;
  onCheck(): void;
};

export function OrbitDataSection({ updatedAt, status, now, onCheck }: OrbitDataSectionProps) {
  const { t, i18n } = useTranslation('settings');
  const checking = status === 'checking';

  return (
    <Section title={t('orbits.title')}>
      <Text style={sectionStyles.body}>
        {updatedAt === null
          ? t('orbits.bundled')
          : t('orbits.updated', { time: formatCountdown(updatedAt, now, i18n.language) })}
      </Text>
      <Text style={[sectionStyles.caption, status === 'failed' && { color: colors.now }]}>
        {checking
          ? t('orbits.checking')
          : status === 'failed'
            ? t('orbits.failed')
            : t('orbits.hint')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: checking }}
        disabled={checking}
        onPress={onCheck}
        style={[sectionStyles.button, checking && { opacity: 0.5 }]}>
        <Text style={sectionStyles.buttonText}>{t('orbits.check')}</Text>
      </Pressable>
    </Section>
  );
}
