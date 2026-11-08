import i18n from '@/i18n';

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

describe.each(SUPPORTED_LANGUAGES)('%s translations', (language) => {
  test.each(namespaces)('%s has every key the fallback language has', (namespace) => {
    expect(baseKeys(resources[language][namespace])).toEqual(
      baseKeys(resources[FALLBACK_LANGUAGE][namespace]),
    );
  });

  test.each(namespaces)('%s has every plural form the language needs', (namespace) => {
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

describe('plurals', () => {
  test.each([
    [0, '0 passes tonight'],
    [1, '1 pass tonight'],
    [3, '3 passes tonight'],
  ])('English pass count for %i', (count, expected) => {
    expect(i18n.t('tonight:passCount', { lng: 'en', count })).toBe(expected);
  });
});

describe('typed keys', () => {
  test('known keys type-check and resolve', () => {
    expect(i18n.t('tabs.tonight')).toBe('Tonight');
    // @ts-expect-error unknown keys must fail to compile
    expect(i18n.t('tabs.doesNotExist')).toBe('tabs.doesNotExist');
  });
});
