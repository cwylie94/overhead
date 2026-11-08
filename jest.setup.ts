import '@/i18n';

import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = jest.requireActual<
    typeof import('react-native-mmkv/lib/createMMKV/createMockMMKV')
  >('react-native-mmkv/lib/createMMKV/createMockMMKV');
  return { createMMKV: createMockMMKV };
});
