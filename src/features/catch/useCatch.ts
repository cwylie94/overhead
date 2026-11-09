import { useEffect } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import type { UpcomingPass } from '@/data/queries';
import { CATCH_HOLD_MS, type CatchState } from '@/domain/catchMachine';
import { catchWindow } from '@/domain/catchWindow';
import { positionOnTrack, type SkyPosition } from '@/domain/sky';
import { useClock, useNow } from '@/environment/clock';
import { useLocation } from '@/environment/location';
import { useSessionFeatures } from '@/session/appSession';
import { useSettingsStore } from '@/stores/settingsStore';
import { ALWAYS_ANIMATE } from '@/ui/motion';

import type { CatchPhase, CatchViewProps } from './CatchView';
import { useAimGesture } from './useAimGesture';
import { useCameraAim } from './useCameraAim';
import { useCatchSession } from './useCatchSession';
import { usePointing } from './usePointing';

export function startingAim(pass: UpcomingPass, at: number): SkyPosition {
  const start = positionOnTrack(pass.track, Math.min(Math.max(at, pass.startAt), pass.endAt));
  return {
    azimuth: ((start?.azimuth ?? 0) + 25) % 360,
    elevation: Math.max(0, (start?.elevation ?? 30) - 15),
  };
}

export function catchPhase(machine: CatchState, waiting: boolean): CatchPhase {
  if (waiting) {
    return 'waiting';
  }
  return machine.status === 'idle' ? 'notUp' : machine.status;
}

export function useCatch(pass: UpcomingPass): Omit<CatchViewProps, 'onDone'> {
  const clock = useClock();
  const now = useNow(1_000);
  const features = useSessionFeatures();
  const location = useLocation();
  const customLocation = useSettingsStore((settings) => settings.customLocation);
  const pointing = usePointing(startingAim(pass, clock.now()));
  const { machine, setTouching } = useCatchSession(pass, pointing);
  const aim = useCameraAim(
    pointing,
    location.state.status === 'ready' ? location.state.observer : null,
    now,
    features.camera,
  );
  const gesture = useAimGesture(pointing, setTouching);
  const time = useSharedValue(clock.now());
  const progress = useSharedValue(0);

  useEffect(() => {
    time.set(
      withTiming(now + 1_000, { duration: 1_000, easing: Easing.linear, ...ALWAYS_ANIMATE }),
    );
  }, [time, now]);

  useEffect(() => {
    if (machine.status === 'locked') {
      progress.set(
        withTiming(1, { duration: CATCH_HOLD_MS, easing: Easing.linear, ...ALWAYS_ANIMATE }),
      );
    } else if (machine.status === 'caught') {
      progress.set(1);
    } else {
      progress.set(withTiming(0, { duration: 150 }));
    }
  }, [machine.status, progress]);

  const manual = pointing.mode === 'manual';

  return {
    pass,
    now,
    phase: catchPhase(machine, catchWindow(pass, now) === 'ready'),
    caught:
      machine.status === 'caught'
        ? { caughtAt: machine.caughtAt, angleError: machine.angleError }
        : null,
    look: positionOnTrack(pass.track, Math.max(now, pass.startAt)),
    chosenLocation: features.chosenLocation ? customLocation : null,
    calibrate: pointing.calibrate && !manual,
    manual,
    gesture,
    sky: {
      time,
      progress,
      azimuth: pointing.azimuth,
      elevation: pointing.elevation,
      roll: pointing.roll,
    },
    aim,
  };
}
