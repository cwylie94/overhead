import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CustomLocation } from '@/stores/settingsStore';
import { spacing } from '@/ui/theme';

import { Section, sectionStyles } from './controls';

type LocationSectionProps = {
  customLocation: CustomLocation | null;
  onChooseCity(): void;
  onUseGps(): void;
};

export function LocationSection({ customLocation, onChooseCity, onUseGps }: LocationSectionProps) {
  const { t } = useTranslation('settings');

  return (
    <Section title={t('location.title')}>
      <Text style={sectionStyles.body}>
        {customLocation
          ? t('location.custom', { name: customLocation.name, country: customLocation.country })
          : t('location.gps')}
      </Text>
      {customLocation && <Text style={sectionStyles.caption}>{t('location.customHint')}</Text>}
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" onPress={onChooseCity} style={sectionStyles.button}>
          <Text style={sectionStyles.buttonText}>{t('location.choose')}</Text>
        </Pressable>
        {customLocation && (
          <Pressable accessibilityRole="button" onPress={onUseGps} style={styles.secondary}>
            <Text style={styles.secondaryText}>{t('location.useGps')}</Text>
          </Pressable>
        )}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  secondary: {
    ...sectionStyles.button,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: sectionStyles.caption.color,
  },
  secondaryText: {
    ...sectionStyles.buttonText,
    color: sectionStyles.body.color,
  },
});
