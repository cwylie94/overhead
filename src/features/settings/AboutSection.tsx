import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { spacing } from '@/ui/theme';

import { Section, sectionStyles } from './controls';

export const DEMO_TAPS = 5;
const TAP_GAP_MS = 1_500;

type AboutSectionProps = {
  version: string;
  onToggleDemo(): void;
};

export function AboutSection({ version, onToggleDemo }: AboutSectionProps) {
  const { t } = useTranslation('settings');
  const taps = useRef(0);
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (reset.current) {
        clearTimeout(reset.current);
      }
    },
    [],
  );

  const tap = () => {
    if (reset.current) {
      clearTimeout(reset.current);
    }
    taps.current += 1;
    if (taps.current >= DEMO_TAPS) {
      taps.current = 0;
      onToggleDemo();
      return;
    }
    reset.current = setTimeout(() => {
      taps.current = 0;
    }, TAP_GAP_MS);
  };

  return (
    <Section title={t('about.title')}>
      <Pressable testID="app-version" hitSlop={spacing.md} onPress={tap}>
        <Text style={sectionStyles.caption}>{t('about.version', { version })}</Text>
      </Pressable>
    </Section>
  );
}
