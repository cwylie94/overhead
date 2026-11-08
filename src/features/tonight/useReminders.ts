import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { UpcomingPass } from '@/data/queries';
import { compassPoint } from '@/domain/compass';
import { positionOnTrack } from '@/domain/sky';
import { useSettingsStore } from '@/stores/settingsStore';

import {
  cancelReminder,
  REMINDER_LEAD,
  reminderId,
  scheduledReminderIds,
  setReminder,
} from './reminders';

export type Reminders = {
  isSet(pass: UpcomingPass): boolean;
  toggle(pass: UpcomingPass): void;
};

export function useReminders(): Reminders | null {
  const enabled = useSettingsStore(
    (settings) => settings.notificationsEnabled && !settings.demoMode,
  );
  const { t } = useTranslation(['tonight', 'common']);
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;
    scheduledReminderIds().then(
      (scheduled) => active && setIds(scheduled),
      () => {},
    );
    return () => {
      active = false;
    };
  }, [enabled]);

  const toggle = useCallback(
    async (pass: UpcomingPass) => {
      const id = reminderId(pass);
      if (ids.has(id)) {
        await cancelReminder(pass);
        setIds((current) => new Set([...current].filter((existing) => existing !== id)));
        return;
      }
      const start = positionOnTrack(pass.track, pass.startAt);
      const scheduled = await setReminder(pass, {
        title: t('reminder.title', { name: pass.name, minutes: REMINDER_LEAD / 60_000 }),
        body: t('reminder.body', {
          direction: t(`common:compass.${compassPoint(start?.azimuth ?? 0)}`),
          degrees: Math.round(pass.maxElevation),
        }),
      });
      if (scheduled) {
        setIds((current) => new Set([...current, id]));
      }
    },
    [ids, t],
  );

  if (!enabled) {
    return null;
  }
  return {
    isSet: (pass) => ids.has(reminderId(pass)),
    toggle: (pass) => {
      toggle(pass).catch(() => {});
    },
  };
}
