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
};
