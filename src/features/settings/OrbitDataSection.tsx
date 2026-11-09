import { useTranslation } from 'react-i18next';

import { formatCountdown } from '@/i18n/format';
import type { RefreshStatus } from '@/stores/orbitRefreshStore';
import { Text } from '@/ui/Text';
import { colors } from '@/ui/theme';

import { Section, sectionStyles } from './controls';

export type OrbitDataSectionProps = {
  updatedAt: number | null;
  status: RefreshStatus;
  now: number;
};

export function OrbitDataSection({ updatedAt, status, now }: OrbitDataSectionProps) {
  const { t, i18n } = useTranslation('settings');

  return (
    <Section title={t('orbits.title')}>
      <Text style={sectionStyles.body}>
        {updatedAt === null
          ? t('orbits.bundled')
          : t('orbits.updated', { time: formatCountdown(updatedAt, now, i18n.language) })}
      </Text>
      <Text style={[sectionStyles.caption, status === 'failed' && { color: colors.now }]}>
        {status === 'checking'
          ? t('orbits.checking')
          : status === 'failed'
            ? t('orbits.failed')
            : t('orbits.hint')}
      </Text>
    </Section>
  );
}
