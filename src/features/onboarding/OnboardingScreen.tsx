import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocation } from '@/environment/location';
import { requestReminderPermission } from '@/reminders/reminders';
import { useSettingsStore } from '@/stores/settingsStore';

import { ONBOARDING_STEPS, OnboardingView } from './OnboardingView';
import { useNeedsOnboarding } from './useNeedsOnboarding';

const LAST_STEP = ONBOARDING_STEPS.length - 1;

export function OnboardingScreen() {
  const { t } = useTranslation('onboarding');
  const [index, setIndex] = useState(0);
  const [usingGps, setUsingGps] = useState(false);
  const customLocation = useSettingsStore((settings) => settings.customLocation);
  const setDemoMode = useSettingsStore((settings) => settings.setDemoMode);
  const setOnboardingComplete = useSettingsStore((settings) => settings.setOnboardingComplete);
  const location = useLocation();
  const needed = useNeedsOnboarding();

  const place = customLocation
    ? `${customLocation.name}, ${customLocation.country}`
    : usingGps || location.state.status === 'ready'
      ? t('location.current')
      : null;

  const next = () => setIndex((current) => Math.min(current + 1, LAST_STEP));
  const finish = () => setOnboardingComplete(true);
  const chooseCity = () => router.push('/location');

  if (!needed) {
    return <Redirect href="/" />;
  }

  return (
    <OnboardingView
      step={ONBOARDING_STEPS[index]!}
      place={place}
      onNext={next}
      onBack={() => setIndex((current) => Math.max(current - 1, 0))}
      onSkip={() => setIndex(LAST_STEP)}
      onDemo={() => setDemoMode(true)}
      onUseLocation={async () => {
        if (await location.askPermission()) {
          setUsingGps(true);
          finish();
        } else {
          chooseCity();
        }
      }}
      onChooseCity={chooseCity}
      onEnableReminders={async () => {
        await requestReminderPermission();
        next();
      }}
      onFinish={finish}
    />
  );
}
