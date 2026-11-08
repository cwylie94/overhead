import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/stores/settingsStore';

import { haptics } from '../haptics';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
  selectionAsync: jest.fn(async () => {}),
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
}));

const mocked = Haptics as jest.Mocked<typeof Haptics>;

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

describe('haptics', () => {
  test('play each effect while haptics are on', () => {
    haptics.aimPulse();
    haptics.locked();
    haptics.caught();

    expect(mocked.selectionAsync).toHaveBeenCalledTimes(1);
    expect(mocked.impactAsync).toHaveBeenCalledWith('medium');
    expect(mocked.notificationAsync).toHaveBeenCalledWith('success');
  });

  test('stay silent when haptics are off', () => {
    useSettingsStore.getState().setHapticsEnabled(false);

    haptics.aimPulse();
    haptics.locked();
    haptics.caught();

    expect(mocked.selectionAsync).not.toHaveBeenCalled();
    expect(mocked.impactAsync).not.toHaveBeenCalled();
    expect(mocked.notificationAsync).not.toHaveBeenCalled();
  });

  test('ignore devices that cannot play them', async () => {
    mocked.selectionAsync.mockRejectedValueOnce(new Error('unavailable'));

    expect(() => haptics.aimPulse()).not.toThrow();
    await Promise.resolve();
  });
});
