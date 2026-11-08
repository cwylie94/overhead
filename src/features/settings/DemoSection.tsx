import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { formatNightDate, formatPassTime } from '@/i18n/format';

import { Section, sectionStyles } from './controls';

type DemoSectionProps = {
  startsAt: number;
  onTurnOff(): void;
};

export function DemoSection({ startsAt, onTurnOff }: DemoSectionProps) {
  const { t, i18n } = useTranslation('settings');

  return (
    <Section title={t('demo.title')}>
      <Text style={sectionStyles.body}>
        {t('demo.body', {
          date: formatNightDate(startsAt, i18n.language),
          time: formatPassTime(startsAt, i18n.language),
        })}
      </Text>
      <Text style={sectionStyles.caption}>{t('demo.separate')}</Text>
      <Pressable accessibilityRole="button" onPress={onTurnOff} style={sectionStyles.button}>
        <Text style={sectionStyles.buttonText}>{t('demo.turnOff')}</Text>
      </Pressable>
    </Section>
  );
}
