import { BRIGHTNESS_TIERS } from '@/domain/brightness';
import { COLLECTION_SETS } from '@/domain/collectionSets';
import { COMPASS_POINTS } from '@/domain/compass';
import { RARITIES } from '@/domain/types';
import i18n from '@/translations';

import { FALLBACK_LANGUAGE, resources, SUPPORTED_LANGUAGES } from '../resources';

type Tree = { [key: string]: string | Tree };

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function flattenKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flattenKeys(value, `${prefix}${key}.`),
  );
}

function baseKeys(tree: Tree): string[] {
  return [...new Set(flattenKeys(tree).map((key) => key.replace(PLURAL_SUFFIX, '')))].sort();
}

const namespaces = Object.keys(resources[FALLBACK_LANGUAGE]) as (keyof (typeof resources)['en'])[];

describe('resources', () => {
  describe.each(SUPPORTED_LANGUAGES)('given the %s translations', (language) => {
    test.each(namespaces)('then %s has every key the fallback language has', (namespace) => {
      expect(baseKeys(resources[language][namespace])).toEqual(
        baseKeys(resources[FALLBACK_LANGUAGE][namespace]),
      );
    });

    test.each(namespaces)('then %s has every plural form the language needs', (namespace) => {
      const keys = flattenKeys(resources[language][namespace]);
      const pluralBases = new Set(
        keys.filter((key) => PLURAL_SUFFIX.test(key)).map((key) => key.replace(PLURAL_SUFFIX, '')),
      );
      const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories;

      for (const base of pluralBases) {
        for (const category of categories) {
          expect(keys).toContain(`${base}_${category}`);
        }
      }
    });
  });
});

describe('i18n', () => {
  describe('given an English pass count', () => {
    test.each([
      { count: 0, expected: '0 passes' },
      { count: 1, expected: '1 pass' },
      { count: 3, expected: '3 passes' },
    ])('then a count of $count reads "$expected"', ({ count, expected }) => {
      expect(i18n.t('tonight:summary', { lng: 'en', count })).toBe(expected);
    });
  });

  describe('given a Spanish pass count', () => {
    test.each([
      { count: 1, expected: '1 paso' },
      { count: 3, expected: '3 pasos' },
      { count: 1_000_000, expected: '1000000 pasos' },
    ])('then a count of $count reads "$expected"', ({ count, expected }) => {
      expect(i18n.t('tonight:summary', { lng: 'es', count })).toBe(expected);
    });
  });

  describe('given the app is in English', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en');
    });

    describe('when the language changes to Spanish', () => {
      beforeEach(async () => {
        await i18n.changeLanguage('es');
      });

      afterEach(async () => {
        await i18n.changeLanguage('en');
      });

      test('then it translates into Spanish', () => {
        expect(i18n.t('tabs.tonight')).toBe('Esta noche');
      });
    });
  });

  describe('given the English strings', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en');
    });

    test('then a known key type-checks and resolves', () => {
      expect(i18n.t('tabs.tonight')).toBe('Tonight');
    });

    test('then an unknown key fails to compile and comes back as the key', () => {
      // @ts-expect-error unknown keys must fail to compile
      expect(i18n.t('tabs.doesNotExist')).toBe('tabs.doesNotExist');
    });

    test('then every compass point has a translation', () => {
      for (const point of COMPASS_POINTS) {
        expect(i18n.t(`compass.${point}`)).not.toBe(`compass.${point}`);
      }
    });

    test('then every brightness tier has a name', () => {
      for (const tier of BRIGHTNESS_TIERS) {
        expect(i18n.t(`brightness.${tier}`)).not.toBe(`brightness.${tier}`);
      }
    });

    test('then every rarity has a name', () => {
      for (const rarity of RARITIES) {
        expect(i18n.t(`rarity.${rarity}`)).not.toBe(`rarity.${rarity}`);
      }
    });

    test('then every collection set has a name', () => {
      for (const set of COLLECTION_SETS) {
        expect(i18n.t(`collection:sets.${set}`)).not.toBe(`sets.${set}`);
      }
    });
  });
});
