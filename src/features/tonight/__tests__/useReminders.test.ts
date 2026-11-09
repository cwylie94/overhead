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
  test('is off when notifications are off', async () => {
    useSettingsStore.setState({ notificationsEnabled: false });

    const { result } = await renderReminders();

    expect(result.current).toBeNull();
    expect(scheduledReminderIds).not.toHaveBeenCalled();
  });

  test('is off in demo mode', async () => {
    useSettingsStore.setState({ demoMode: true });

    const { result } = await renderReminders();

    expect(result.current).toBeNull();
  });

  test('knows which passes already have a reminder', async () => {
    jest.mocked(scheduledReminderIds).mockResolvedValue(new Set([reminderId(pass)]));

    const { result } = await renderReminders();

    expect(result.current!.isSet(pass)).toBe(true);
    expect(result.current!.isSet({ ...pass, noradId: 20580 })).toBe(false);
  });

  test('sets a reminder that says where to look and how high', async () => {
    const { result } = await renderReminders();

    await act(async () => result.current!.toggle(pass));

    expect(setReminder).toHaveBeenCalledWith(pass, {
      title: 'ISS (ZARYA) in 5 minutes',
      body: 'Look SW. It climbs to 56°.',
    });
    expect(result.current!.isSet(pass)).toBe(true);
  });

  test('stays unset when the reminder could not be scheduled', async () => {
    jest.mocked(setReminder).mockResolvedValue(false);
    const { result } = await renderReminders();

    await act(async () => result.current!.toggle(pass));

    expect(result.current!.isSet(pass)).toBe(false);
  });

  test('cancels a reminder that is already set', async () => {
    jest.mocked(scheduledReminderIds).mockResolvedValue(new Set([reminderId(pass)]));
    const { result } = await renderReminders();

    await act(async () => result.current!.toggle(pass));

    expect(cancelReminder).toHaveBeenCalledWith(pass);
    expect(setReminder).not.toHaveBeenCalled();
    expect(result.current!.isSet(pass)).toBe(false);
  });

  test('carries on when the notifications fail', async () => {
    jest.mocked(scheduledReminderIds).mockRejectedValue(new Error('denied'));
    jest.mocked(setReminder).mockRejectedValue(new Error('denied'));
    const { result } = await renderReminders();

    await act(async () => result.current!.toggle(pass));

    expect(result.current!.isSet(pass)).toBe(false);
  });
});
