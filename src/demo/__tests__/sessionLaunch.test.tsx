import { renderHook } from '@testing-library/react-native';

import { useAppSession } from '../session';
import { DEMO_PASS } from '../testing/demoMocks';

jest.mock('@/data/client', () => ({
  deviceData: () => ({ key: 'device' }),
  freshDemoData: () => ({ key: 'demo-1' }),
}));

jest.mock('@/data/snapshot', () => ({ bundledSnapshot: {} }));

jest.mock('../scenario', () => ({
  ...jest.requireActual('../scenario'),
  findDemoPass: () => jest.requireActual('../testing/demoMocks').DEMO_PASS,
}));

jest.mock('@/stores/settingsStore', () => {
  const actual = jest.requireActual('@/stores/settingsStore');
  actual.useSettingsStore.setState({ demoMode: true });
  return actual;
});

test('reopens in demo mode when it was left on', async () => {
  const { result } = await renderHook(() => useAppSession());

  expect(result.current.data).toEqual({ key: 'demo-1' });
  expect(result.current.demo?.pass).toEqual(DEMO_PASS);
});
