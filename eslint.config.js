const fs = require('node:fs');

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

const features = fs.readdirSync('./src/features');
const sharedLayers = [
  './src/data',
  './src/demo',
  './src/domain',
  './src/environment',
  './src/reminders',
  './src/session',
  './src/stores',
  './src/sync',
  './src/translations',
  './src/ui',
];

const layerZones = [
  {
    target: './src/domain',
    from: './src',
    except: ['./domain'],
    message: 'domain is pure: it imports only other domain modules.',
  },
  {
    target: './src/data',
    from: [
      './src/demo',
      './src/environment',
      './src/reminders',
      './src/session',
      './src/stores',
      './src/sync',
      './src/ui',
    ],
    message: 'data depends only on domain. React wiring belongs in src/session.',
  },
  {
    target: sharedLayers,
    from: ['./src/features', './src/app'],
    message: 'Shared layers never import features or routes. Move the shared code down a layer.',
  },
  {
    target: './src/features',
    from: './src/app',
    message: 'Features never import routes.',
  },
  ...features.map((feature) => ({
    target: `./src/features/${feature}`,
    from: './src/features',
    except: [`./${feature}`],
    message: 'Features never import each other. Move what they share into domain or ui.',
  })),
];

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: [
      'dist/*',
      '.expo/*',
      'ios/*',
      'android/*',
      'expo-env.d.ts',
      'src/data/migrations/*',
      'vendor/*',
    ],
  },
  {
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['**/__tests__/**', '**/__benchmarks__/**', '**/testing/**'],
    rules: {
      'import/no-restricted-paths': ['error', { zones: layerZones }],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'drizzle-orm/expo-sqlite',
              importNames: ['useLiveQuery'],
              message:
                "Use useLiveQuery from '@/data/liveQuery/useLiveQuery', which batches row changes into one reload.",
            },
            {
              name: 'react-native',
              importNames: ['Text'],
              message:
                "Use Text from '@/ui/Text', which caps font scaling at the size the layouts are checked at.",
            },
          ],
        },
      ],
    },
  },
]);
