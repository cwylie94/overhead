import * as Notifications from 'expo-notifications';

import {
  canRemind,
  cancelAllReminders,
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
const PASS_REMINDER_AND_ANOTHER = [
  { identifier: reminderId(pass) },
  { identifier: 'something-else' },
] as Notifications.NotificationRequest[];

beforeEach(() => jest.clearAllMocks());

describe('reminderId', () => {
  describe('given the same satellite and start minute after the cache is rebuilt', () => {
    test('then the id stays the same', () => {
      expect(reminderId(pass)).toBe(reminderId({ ...pass, startAt: pass.startAt + 20_000 }));
    });
  });

  describe('given a different satellite at the same time', () => {
    test('then the id is different', () => {
      expect(reminderId(pass)).not.toBe(reminderId({ ...pass, noradId: 1 }));
    });
  });
});

describe('canRemind', () => {
  describe('given the pass is more than the lead time away', () => {
    test('then it can remind the user', () => {
      expect(canRemind(pass, pass.startAt - REMINDER_LEAD - 1)).toBe(true);
    });
  });

  describe('given the pass is only the lead time away', () => {
    test('then it cannot remind the user', () => {
      expect(canRemind(pass, pass.startAt - REMINDER_LEAD)).toBe(false);
    });
  });
});

describe('setReminder', () => {
  let set: boolean;

  describe('given notifications are allowed', () => {
    beforeEach(() => {
      mocked.getPermissionsAsync.mockResolvedValue(granted);
    });

    describe('when the user sets a reminder', () => {
      beforeEach(async () => {
        set = await setReminder(pass, content);
      });

      test('then the reminder is set', () => {
        expect(set).toBe(true);
      });

      test('then it schedules a notification five minutes before the pass', () => {
        expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
          identifier: reminderId(pass),
          content,
          trigger: { type: 'date', date: pass.startAt - REMINDER_LEAD },
        });
      });
    });
  });

  describe('given the user has not been asked about notifications yet and will allow them', () => {
    beforeEach(() => {
      mocked.getPermissionsAsync.mockResolvedValue({ ...refused, canAskAgain: true });
      mocked.requestPermissionsAsync.mockResolvedValue(granted);
    });

    describe('when the user sets a reminder', () => {
      beforeEach(async () => {
        set = await setReminder(pass, content);
      });

      test('then the reminder is set', () => {
        expect(set).toBe(true);
      });

      test('then it asks the user for permission', () => {
        expect(mocked.requestPermissionsAsync).toHaveBeenCalled();
      });
    });
  });

  describe('given notifications are refused', () => {
    beforeEach(() => {
      mocked.getPermissionsAsync.mockResolvedValue(refused);
    });

    describe('when the user sets a reminder', () => {
      beforeEach(async () => {
        set = await setReminder(pass, content);
      });

      test('then the reminder is not set', () => {
        expect(set).toBe(false);
      });

      test('then it schedules nothing', () => {
        expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
      });
    });
  });
});

describe('cancelReminder', () => {
  describe('given a pass reminder and another notification are scheduled', () => {
    beforeEach(() => {
      mocked.getAllScheduledNotificationsAsync.mockResolvedValue(PASS_REMINDER_AND_ANOTHER);
    });

    describe('when the user cancels the reminder', () => {
      beforeEach(async () => {
        await cancelReminder(pass);
      });

      test('then it cancels the notification with the pass id', () => {
        expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith(reminderId(pass));
      });
    });
  });
});

describe('scheduledReminderIds', () => {
  describe('given a pass reminder and another notification are scheduled', () => {
    beforeEach(() => {
      mocked.getAllScheduledNotificationsAsync.mockResolvedValue(PASS_REMINDER_AND_ANOTHER);
    });

    describe('when the reminders are listed', () => {
      let ids: Set<string>;

      beforeEach(async () => {
        ids = await scheduledReminderIds();
      });

      test('then it lists only the pass reminder', () => {
        expect(ids).toEqual(new Set([reminderId(pass)]));
      });
    });
  });
});

describe('cancelAllReminders', () => {
  describe('given a pass reminder and another notification are scheduled', () => {
    beforeEach(() => {
      mocked.getAllScheduledNotificationsAsync.mockResolvedValue(PASS_REMINDER_AND_ANOTHER);
      mocked.cancelScheduledNotificationAsync.mockClear();
    });

    describe('when all reminders are cancelled', () => {
      beforeEach(async () => {
        await cancelAllReminders();
      });

      test('then it leaves the notification that is not a pass reminder', () => {
        expect(mocked.cancelScheduledNotificationAsync.mock.calls).toEqual([[reminderId(pass)]]);
      });
    });
  });
});
