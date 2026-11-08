import * as Notifications from 'expo-notifications';

export const REMINDER_LEAD = 5 * 60_000;
const MINUTE = 60_000;
const PREFIX = 'pass-';

export type ReminderPass = { noradId: number; startAt: number };
export type ReminderContent = { title: string; body: string };

export function reminderId({ noradId, startAt }: ReminderPass): string {
  return `${PREFIX}${noradId}-${Math.floor(startAt / MINUTE)}`;
}

export function canRemind(pass: ReminderPass, now: number): boolean {
  return pass.startAt - REMINDER_LEAD > now;
}

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduledReminderIds(): Promise<Set<string>> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return new Set(
    scheduled.map((request) => request.identifier).filter((id) => id.startsWith(PREFIX)),
  );
}

async function hasPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function setReminder(pass: ReminderPass, content: ReminderContent): Promise<boolean> {
  if (!(await hasPermission())) {
    return false;
  }
  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(pass),
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: pass.startAt - REMINDER_LEAD,
    },
  });
  return true;
}

export async function cancelReminder(pass: ReminderPass): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(reminderId(pass));
}
