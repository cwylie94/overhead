import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CustomLocation } from '@/stores/settingsStore';
import { Icon } from '@/ui/Icon';
import { colors, spacing } from '@/ui/theme';

import { Section, sectionStyles } from './controls';

const ICON_SIZE = 20;

type LocationSectionProps = {
  customLocation: CustomLocation | null;
  onChooseCity(): void;
  onUseGps(): void;
};

export function LocationSection({ customLocation, onChooseCity, onUseGps }: LocationSectionProps) {
  const { t } = useTranslation('settings');

  return (
    <Section title={t('location.title')}>
      <View style={styles.current}>
        <Icon
          name={customLocation ? 'chosenPlace' : 'location'}
          size={ICON_SIZE}
          tintColor={colors.accent}
          fallback={null}
        />
        <Text style={sectionStyles.body}>
          {customLocation ? customLocation.name : t('location.current')}
        </Text>
      </View>
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
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  secondary: {
    ...sectionStyles.button,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    ...sectionStyles.buttonText,
    color: colors.text,
  },
});
