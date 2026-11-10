import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppData } from '@/data/AppDataContext';
import type { PassSummary } from '@/data/queries';
import type { Repositories } from '@/data/repositories';
import { compassPoint } from '@/domain/compass';
import { positionOnTrack } from '@/domain/sky';
import { useSessionFeatures } from '@/session/appSession';
import { useSettingsStore } from '@/stores/settingsStore';

import {
  cancelReminder,
  REMINDER_LEAD,
  reminderId,
  scheduledReminderIds,
  setReminder,
} from './reminders';

const SAME_PASS_WITHIN = 2 * 60_000;

function storedTrack(repositories: Repositories, { noradId, startAt }: PassSummary) {
  return repositories.passes
    .listBetween(startAt - SAME_PASS_WITHIN, startAt + SAME_PASS_WITHIN)
    .find(
      (stored) =>
        stored.noradId === noradId && Math.abs(stored.startAt - startAt) <= SAME_PASS_WITHIN,
    )?.track;
}

export type Reminders = {
  isSet(pass: PassSummary): boolean;
  toggle(pass: PassSummary): void;
};

export function useReminders(): Reminders | null {
  const notificationsEnabled = useSettingsStore((settings) => settings.notificationsEnabled);
  const enabled = useSessionFeatures().reminders && notificationsEnabled;
  const { t } = useTranslation(['tonight', 'common']);
  const { repositories } = useAppData();
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
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
    }, [enabled]),
  );

  const toggle = useCallback(
    async (pass: PassSummary) => {
      const id = reminderId(pass);
      if (ids.has(id)) {
        await cancelReminder(pass);
        setIds((current) => new Set([...current].filter((existing) => existing !== id)));
        return;
      }
      const track = storedTrack(repositories, pass);
      const start = track ? positionOnTrack(track, pass.startAt) : null;
      const degrees = Math.round(pass.maxElevation);
      const scheduled = await setReminder(pass, {
        title: t('reminder.title', { name: pass.name, minutes: REMINDER_LEAD / 60_000 }),
        body: start
          ? t('reminder.body', {
              direction: t(`common:directions.${compassPoint(start.azimuth)}`),
              degrees,
            })
          : t('reminder.bodyHeight', { degrees }),
      });
      if (scheduled) {
        setIds((current) => new Set([...current, id]));
      }
    },
    [ids, repositories, t],
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
