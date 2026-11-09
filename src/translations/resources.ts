import catchEn from './locales/en/catch.json';
import collectionEn from './locales/en/collection.json';
import commonEn from './locales/en/common.json';
import onboardingEn from './locales/en/onboarding.json';
import settingsEn from './locales/en/settings.json';
import skyEn from './locales/en/sky.json';
import tonightEn from './locales/en/tonight.json';
import catchEs from './locales/es/catch.json';
import collectionEs from './locales/es/collection.json';
import commonEs from './locales/es/common.json';
import onboardingEs from './locales/es/onboarding.json';
import settingsEs from './locales/es/settings.json';
import skyEs from './locales/es/sky.json';
import tonightEs from './locales/es/tonight.json';

export const resources = {
  en: {
    common: commonEn,
    catch: catchEn,
    collection: collectionEn,
    onboarding: onboardingEn,
    sky: skyEn,
    settings: settingsEn,
    tonight: tonightEn,
  },
  es: {
    common: commonEs,
    catch: catchEs,
    collection: collectionEs,
    onboarding: onboardingEs,
    sky: skyEs,
    settings: settingsEs,
    tonight: tonightEs,
  },
} as const;

export const defaultNS = 'common';

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const FALLBACK_LANGUAGE: Language = 'en';
