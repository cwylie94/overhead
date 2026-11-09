import { act, renderHook } from '@testing-library/react-native';

import type { UpcomingPass } from '@/data/queries';
import { useSettingsStore } from '@/stores/settingsStore';

import { cancelReminder, reminderId, scheduledReminderIds, setReminder } from '../reminders';
import { useReminders } from '../useReminders';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return { useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});

jest.mock('expo-notifications', () => ({}));

jest.mock('../reminders', () => ({
  ...jest.requireActual('../reminders'),
  scheduledReminderIds: jest.fn(),
  setReminder: jest.fn(),
  cancelReminder: jest.fn(),
}));

const START = Date.UTC(2026, 10, 8, 20, 0);
const MINUTE = 60_000;

const pass: UpcomingPass = {
  id: 1,
  noradId: 25544,
  startAt: START,
  peakAt: START + 2 * MINUTE,
  endAt: START + 4 * MINUTE,
  maxElevation: 56.4,
  peakMagnitude: -2,
  track: [
    { time: START, azimuth: 225, elevation: 10 },
    { time: START + 4 * MINUTE, azimuth: 45, elevation: 10 },
  ],
  name: 'ISS (ZARYA)',
  rarity: 'common',
};

type HookResult = Awaited<ReturnType<typeof renderReminders>>['result'];

async function renderReminders() {
  const hook = await renderHook(() => useReminders());
  await act(async () => {});
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState({ notificationsEnabled: true, demoMode: false });
  jest.mocked(scheduledReminderIds).mockResolvedValue(new Set());
  jest.mocked(setReminder).mockResolvedValue(true);
  jest.mocked(cancelReminder).mockResolvedValue();
});

describe('useReminders', () => {
  let result: HookResult;

  describe('given notifications are turned off', () => {
    beforeEach(() => {
      useSettingsStore.setState({ notificationsEnabled: false, demoMode: false });
    });

    describe('when the hook renders', () => {
      beforeEach(async () => {
        ({ result } = await renderReminders());
      });

      test('then it offers no reminders', () => {
        expect(result.current).toBeNull();
      });

      test('then it does not look up the scheduled reminders', () => {
        expect(scheduledReminderIds).not.toHaveBeenCalled();
      });
    });
  });

  describe('given demo mode is on', () => {
    beforeEach(() => {
      useSettingsStore.setState({ notificationsEnabled: true, demoMode: true });
    });

    describe('when the hook renders', () => {
      beforeEach(async () => {
        ({ result } = await renderReminders());
      });

      test('then it offers no reminders', () => {
        expect(result.current).toBeNull();
      });
    });
  });

  describe('given a reminder is already scheduled for the pass', () => {
    beforeEach(() => {
      jest.mocked(scheduledReminderIds).mockResolvedValue(new Set([reminderId(pass)]));
    });

    describe('when the hook renders', () => {
      beforeEach(async () => {
        ({ result } = await renderReminders());
      });

      test('then it knows the pass has a reminder', () => {
        expect(result.current!.isSet(pass)).toBe(true);
      });

      test('then it knows another satellite has none', () => {
        expect(result.current!.isSet({ ...pass, noradId: 20580 })).toBe(false);
      });
    });
  });

  describe('given the reminders loaded with none scheduled', () => {
    beforeEach(async () => {
      jest.mocked(scheduledReminderIds).mockResolvedValue(new Set());
      jest.mocked(setReminder).mockResolvedValue(true);
      ({ result } = await renderReminders());
    });

    describe('when the user turns on the reminder for the pass', () => {
      beforeEach(async () => {
        await act(async () => result.current!.toggle(pass));
      });

      test('then it sets a reminder that says where to look and how high', () => {
        expect(setReminder).toHaveBeenCalledWith(pass, {
          title: 'ISS (ZARYA) in 5 minutes',
          body: 'Look southwest. It climbs to 56°.',
        });
      });

      test('then the pass has a reminder', () => {
        expect(result.current!.isSet(pass)).toBe(true);
      });
    });
  });

  describe('given the reminders loaded and a reminder cannot be scheduled', () => {
    beforeEach(async () => {
      jest.mocked(scheduledReminderIds).mockResolvedValue(new Set());
      jest.mocked(setReminder).mockResolvedValue(false);
      ({ result } = await renderReminders());
    });

    describe('when the user turns on the reminder for the pass', () => {
      beforeEach(async () => {
        await act(async () => result.current!.toggle(pass));
      });

      test('then the pass stays without a reminder', () => {
        expect(result.current!.isSet(pass)).toBe(false);
      });
    });
  });

  describe('given the reminders loaded with one set for the pass', () => {
    beforeEach(async () => {
      jest.mocked(scheduledReminderIds).mockResolvedValue(new Set([reminderId(pass)]));
      ({ result } = await renderReminders());
    });

    describe('when the user turns off the reminder for the pass', () => {
      beforeEach(async () => {
        await act(async () => result.current!.toggle(pass));
      });

      test('then it cancels the reminder', () => {
        expect(cancelReminder).toHaveBeenCalledWith(pass);
      });

      test('then it sets no new reminder', () => {
        expect(setReminder).not.toHaveBeenCalled();
      });

      test('then the pass no longer has a reminder', () => {
        expect(result.current!.isSet(pass)).toBe(false);
      });
    });
  });

  describe('given the reminders loaded while the notifications fail', () => {
    beforeEach(async () => {
      jest.mocked(scheduledReminderIds).mockRejectedValue(new Error('denied'));
      jest.mocked(setReminder).mockRejectedValue(new Error('denied'));
      ({ result } = await renderReminders());
    });

    describe('when the user turns on the reminder for the pass', () => {
      beforeEach(async () => {
        await act(async () => result.current!.toggle(pass));
      });

      test('then it carries on with the pass still without a reminder', () => {
        expect(result.current!.isSet(pass)).toBe(false);
      });
    });
  });
});
