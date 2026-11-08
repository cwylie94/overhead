import './polyfills';

import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  defaultNS,
  FALLBACK_LANGUAGE,
  resources,
  SUPPORTED_LANGUAGES,
  type Language,
} from './resources';

export function isSupportedLanguage(code: string | null | undefined): code is Language {
  return SUPPORTED_LANGUAGES.some((language) => language === code);
}

export function detectDeviceLanguage(): Language {
  const match = getLocales().find((locale) => isSupportedLanguage(locale.languageCode));
  return isSupportedLanguage(match?.languageCode) ? match.languageCode : FALLBACK_LANGUAGE;
}

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  defaultNS,
  ns: Object.keys(resources[FALLBACK_LANGUAGE]),
  initAsync: false,
  interpolation: { escapeValue: false },
});

export default i18n;
export type { Language };
