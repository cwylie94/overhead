import { renderHook } from '@testing-library/react-native';

import { useAppSession, type AppSession } from '../session';
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

describe('useAppSession', () => {
  describe('given demo mode was left on', () => {
    describe('when the app opens', () => {
      let session: { current: AppSession };

      beforeEach(async () => {
        ({ result: session } = await renderHook(() => useAppSession()));
      });

      test('then it reopens on the demo database', () => {
        expect(session.current.data).toEqual({ key: 'demo-1' });
      });

      test('then it reopens on the demo pass', () => {
        expect(session.current.demo?.pass).toEqual(DEMO_PASS);
      });
    });
  });
});
