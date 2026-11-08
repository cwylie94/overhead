import catchEn from './locales/en/catch.json';
import collectionEn from './locales/en/collection.json';
import commonEn from './locales/en/common.json';
import skyEn from './locales/en/sky.json';
import tonightEn from './locales/en/tonight.json';

export const resources = {
  en: {
    common: commonEn,
    catch: catchEn,
    collection: collectionEn,
    sky: skyEn,
    tonight: tonightEn,
  },
} as const;

export const defaultNS = 'common';

export const SUPPORTED_LANGUAGES = ['en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const FALLBACK_LANGUAGE: Language = 'en';
