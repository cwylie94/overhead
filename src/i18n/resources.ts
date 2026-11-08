import commonEn from './locales/en/common.json';
import tonightEn from './locales/en/tonight.json';

export const resources = {
  en: {
    common: commonEn,
    tonight: tonightEn,
  },
} as const;

export const defaultNS = 'common';

export const SUPPORTED_LANGUAGES = ['en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const FALLBACK_LANGUAGE: Language = 'en';
