import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { Section, sectionStyles } from './controls';

type AboutSectionProps = {
  version: string;
};

export function AboutSection({ version }: AboutSectionProps) {
  const { t } = useTranslation('settings');

  return (
    <Section title={t('about.title')}>
      <Text style={sectionStyles.caption}>{t('about.version', { version })}</Text>
    </Section>
  );
}
