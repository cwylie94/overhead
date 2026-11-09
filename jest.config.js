const { readFileSync } = require('node:fs');

const REQUIRED_NODE = Number(readFileSync(require.resolve('./.nvmrc'), 'utf8').trim());
const runningNode = Number(process.versions.node.split('.')[0]);

if (runningNode < REQUIRED_NODE) {
  console.error(
    `The tests need Node ${REQUIRED_NODE} (see .nvmrc), but this is Node ${process.versions.node}. ` +
      'Run `nvm use` first. Older versions crash loading better-sqlite3.',
  );
  process.exit(1);
}

const TRANSFORMED_PACKAGES = [
  '.pnpm',
  'react-native',
  '@react-native',
  '@react-native-community',
  'expo',
  '@expo',
  '@expo-google-fonts',
  'react-navigation',
  '@react-navigation',
  '@sentry/react-native',
  'native-base',
  'standard-navigation',
  '@formatjs',
  'satellite.js',
];

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^satellite\\.js$': '<rootDir>/node_modules/satellite.js/dist/index.js',
  },
  transformIgnorePatterns: [
    `/node_modules/(?!(${TRANSFORMED_PACKAGES.join('|')}))`,
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__benchmarks__/**',
    '!src/**/testing/**',
    '!src/data/migrations/**',
  ],
  coverageReporters: ['text', 'text-summary', 'html'],
  coverageThreshold: {
    global: { statements: 65, branches: 69, functions: 60, lines: 65 },
    './src/domain/': { statements: 98, branches: 94, functions: 100, lines: 98 },
    './src/stores/': { statements: 97, branches: 95, functions: 96, lines: 96 },
    './src/sync/': { statements: 98, branches: 90, functions: 100, lines: 98 },
    './src/data/repositories/': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './src/demo/': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './src/session/': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './src/translations/': { statements: 100, branches: 91, functions: 100, lines: 100 },
  },
};
