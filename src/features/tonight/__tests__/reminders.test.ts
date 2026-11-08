import * as Notifications from 'expo-notifications';

import {
  canRemind,
  cancelReminder,
  REMINDER_LEAD,
  reminderId,
  scheduledReminderIds,
  setReminder,
} from '../reminders';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const pass = { noradId: 22566, startAt: Date.UTC(2026, 10, 8, 21, 12, 30) };
const content = { title: 'SL-16 R/B in 5 minutes', body: 'Look SW. It climbs to 55°.' };
const granted = { granted: true, canAskAgain: true } as Notifications.NotificationPermissionsStatus;
const refused = {
  granted: false,
  canAskAgain: false,
} as Notifications.NotificationPermissionsStatus;

beforeEach(() => jest.clearAllMocks());

describe('reminderId', () => {
  test('is stable for the same satellite and start minute, even if the cache is rebuilt', () => {
    expect(reminderId(pass)).toBe(reminderId({ ...pass, startAt: pass.startAt + 20_000 }));
    expect(reminderId(pass)).not.toBe(reminderId({ ...pass, noradId: 1 }));
  });
});

describe('canRemind', () => {
  test('only for passes more than the lead time away', () => {
    expect(canRemind(pass, pass.startAt - REMINDER_LEAD - 1)).toBe(true);
    expect(canRemind(pass, pass.startAt - REMINDER_LEAD)).toBe(false);
  });
});

describe('setReminder', () => {
  test('schedules a notification five minutes before the pass', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(granted);

    expect(await setReminder(pass, content)).toBe(true);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: reminderId(pass),
      content,
      trigger: { type: 'date', date: pass.startAt - REMINDER_LEAD },
    });
  });

  test('asks for permission the first time', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ ...refused, canAskAgain: true });
    mocked.requestPermissionsAsync.mockResolvedValue(granted);

    expect(await setReminder(pass, content)).toBe(true);
    expect(mocked.requestPermissionsAsync).toHaveBeenCalled();
  });

  test('schedules nothing when notifications are refused', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(refused);

    expect(await setReminder(pass, content)).toBe(false);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cancelReminder and scheduledReminderIds', () => {
  test('cancel by the pass id and list only pass reminders', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: reminderId(pass) },
      { identifier: 'something-else' },
    ] as Notifications.NotificationRequest[]);

    await cancelReminder(pass);

    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith(reminderId(pass));
    expect(await scheduledReminderIds()).toEqual(new Set([reminderId(pass)]));
  });
});
