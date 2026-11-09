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

function playEveryEffect() {
  haptics.aimPulse();
  haptics.locked();
  haptics.caught();
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

describe('haptics', () => {
  describe('given haptics are on', () => {
    beforeEach(() => {
      useSettingsStore.getState().setHapticsEnabled(true);
    });

    describe('when the aim pulse, lock and catch effects play', () => {
      beforeEach(() => {
        playEveryEffect();
      });

      test('then the aim pulse plays one selection tick', () => {
        expect(mocked.selectionAsync).toHaveBeenCalledTimes(1);
      });

      test('then the lock plays a medium impact', () => {
        expect(mocked.impactAsync).toHaveBeenCalledWith('medium');
      });

      test('then the catch plays a success notification', () => {
        expect(mocked.notificationAsync).toHaveBeenCalledWith('success');
      });
    });
  });

  describe('given haptics are off', () => {
    beforeEach(() => {
      useSettingsStore.getState().setHapticsEnabled(false);
    });

    describe('when the aim pulse, lock and catch effects play', () => {
      beforeEach(() => {
        playEveryEffect();
      });

      test('then they stay silent', () => {
        expect(mocked.selectionAsync).not.toHaveBeenCalled();
        expect(mocked.impactAsync).not.toHaveBeenCalled();
        expect(mocked.notificationAsync).not.toHaveBeenCalled();
      });
    });
  });

  describe('given a device that cannot play haptics', () => {
    beforeEach(() => {
      mocked.selectionAsync.mockRejectedValueOnce(new Error('unavailable'));
    });

    describe('when the aim pulse plays', () => {
      const aimPulse = jest.fn(() => haptics.aimPulse());

      beforeEach(async () => {
        aimPulse.mockClear();
        aimPulse();
        await Promise.resolve();
      });

      test('then it is ignored without an error', () => {
        expect(aimPulse).toHaveReturned();
      });
    });
  });
});
