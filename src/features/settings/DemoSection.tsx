import { useTranslation } from 'react-i18next';

import { formatNightDate, formatPassTime } from '@/translations/format';
import { Text } from '@/ui/Text';

import { Row, Section, sectionStyles, Toggle } from './controls';

type DemoSectionProps = {
  startsAt: number | null;
  onChange(enabled: boolean): void;
};

export function DemoSection({ startsAt, onChange }: DemoSectionProps) {
  const { t, i18n } = useTranslation('settings');
  const enabled = startsAt !== null;

  return (
    <Section title={t('demo.title')}>
      <Row label={t('demo.toggle')} hint={enabled ? undefined : t('demo.hint')}>
        <Toggle testID="demo-mode" label={t('demo.toggle')} value={enabled} onChange={onChange} />
      </Row>
      {startsAt !== null && (
        <>
          <Text style={sectionStyles.body}>
            {t('demo.body', {
              date: formatNightDate(startsAt, i18n.language),
              time: formatPassTime(startsAt, i18n.language),
            })}
          </Text>
          <Text style={sectionStyles.caption}>{t('demo.separate')}</Text>
        </>
      )}
    </Section>
  );
}
