import { useTranslation } from 'react-i18next';

import type { UnitSystem } from '@/domain/types';
import { SUPPORTED_LANGUAGES, type Language } from '@/i18n/resources';
import {
  MIN_ELEVATION_LIMITS,
  MOTION_PREFERENCES,
  type MotionPreference,
  type SettingsState,
} from '@/stores/settingsStore';

import { Row, Section, Segmented, Stepper, Toggle } from './controls';

export const MIN_ELEVATION_STEP = 5;

export type Preferences = Pick<
  SettingsState,
  | 'language'
  | 'units'
  | 'minElevation'
  | 'notificationsEnabled'
  | 'hapticsEnabled'
  | 'motionPreference'
>;

export type PreferenceActions = {
  setLanguage(language: Language | null): void;
  setUnits(units: UnitSystem): void;
  setMinElevation(degrees: number): void;
  setNotificationsEnabled(enabled: boolean): void;
  setHapticsEnabled(enabled: boolean): void;
  setMotionPreference(preference: MotionPreference): void;
};

type PreferencesSectionsProps = {
  preferences: Preferences;
  actions: PreferenceActions;
};

const SYSTEM_LANGUAGE = 'system';
type LanguageChoice = Language | typeof SYSTEM_LANGUAGE;

export function PreferencesSections({ preferences, actions }: PreferencesSectionsProps) {
  const { t } = useTranslation('settings');
  const { minElevation } = preferences;

  return (
    <>
      <Section title={t('viewing.title')}>
        <Row label={t('viewing.minElevation')} hint={t('viewing.minElevationHint')}>
          <Stepper
            label={t('viewing.minElevation')}
            valueText={t('viewing.degrees', { value: minElevation })}
            decreaseLabel={t('viewing.lower')}
            increaseLabel={t('viewing.higher')}
            canDecrease={minElevation > MIN_ELEVATION_LIMITS.min}
            canIncrease={minElevation < MIN_ELEVATION_LIMITS.max}
            onDecrease={() => actions.setMinElevation(minElevation - MIN_ELEVATION_STEP)}
            onIncrease={() => actions.setMinElevation(minElevation + MIN_ELEVATION_STEP)}
          />
        </Row>
        <Row label={t('viewing.units')} stacked>
          <Segmented<UnitSystem>
            label={t('viewing.units')}
            options={[
              { value: 'metric', label: t('viewing.metric') },
              { value: 'imperial', label: t('viewing.imperial') },
            ]}
            selected={preferences.units}
            onSelect={actions.setUnits}
          />
        </Row>
      </Section>

      <Section title={t('language.title')}>
        <Segmented<LanguageChoice>
          label={t('language.title')}
          options={[
            { value: SYSTEM_LANGUAGE, label: t('language.system') },
            ...SUPPORTED_LANGUAGES.map((language) => ({
              value: language,
              label: t(`language.${language}`),
            })),
          ]}
          selected={preferences.language ?? SYSTEM_LANGUAGE}
          onSelect={(choice) => actions.setLanguage(choice === SYSTEM_LANGUAGE ? null : choice)}
        />
      </Section>

      <Section title={t('feedback.title')}>
        <Row label={t('feedback.reminders')} hint={t('feedback.remindersHint')}>
          <Toggle
            label={t('feedback.reminders')}
            value={preferences.notificationsEnabled}
            onChange={actions.setNotificationsEnabled}
          />
        </Row>
        <Row label={t('feedback.haptics')} hint={t('feedback.hapticsHint')}>
          <Toggle
            label={t('feedback.haptics')}
            value={preferences.hapticsEnabled}
            onChange={actions.setHapticsEnabled}
          />
        </Row>
        <Row label={t('feedback.motion')} hint={t('feedback.motionHint')} stacked>
          <Segmented<MotionPreference>
            label={t('feedback.motion')}
            options={MOTION_PREFERENCES.map((preference) => ({
              value: preference,
              label: t(`feedback.motionOptions.${preference}`),
            }))}
            selected={preferences.motionPreference}
            onSelect={actions.setMotionPreference}
          />
        </Row>
      </Section>
    </>
  );
}
