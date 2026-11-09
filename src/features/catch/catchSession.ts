import type { SightingInput } from '@/data/sightings/logSighting';
import type { CatchState, CatchTarget } from '@/domain/catchMachine';
import { aimError, type SkyPosition } from '@/domain/sky';
import type { Rarity, TrackPoint } from '@/domain/types';
import type { Clock } from '@/environment/clock';

import { aimCounts, pulseInterval } from './pointing';
import type { PointingMode } from './usePointing';

export const AIM_TICK_MS = 50;
const IDLE_PULSE_MS = 200;

export type CatchPass = {
  noradId: number;
  startAt: number;
  endAt: number;
  track: TrackPoint[];
  rarity: Rarity;
};

export type CatchMachine = {
  current(): CatchState;
  start(target: CatchTarget, at: number): void;
  aim(angleError: number, at: number): void;
  passEnded(): void;
  reset(): void;
};

export type CatchHaptics = {
  aimPulse(): void;
  locked(): void;
  caught(): void;
  bigCatch(): void;
};

export type CatchSessionOptions = {
  pass: CatchPass;
  clock: Clock;
  machine: CatchMachine;
  haptics: CatchHaptics;
  readAim(): SkyPosition;
  readMode(): PointingMode;
  logCatch(sighting: SightingInput): void;
};

export type RunningCatch = {
  setTouching(touching: boolean): void;
  stop(): void;
};

export function startCatchSession({
  pass,
  clock,
  machine,
  haptics,
  readAim,
  readMode,
  logCatch,
}: CatchSessionOptions): RunningCatch {
  let touching = false;
  let latestError: number | null = null;

  const followTransition = (before: CatchState) => {
    const after = machine.current();
    if (after === before) {
      return;
    }
    if (after.status === 'locked' && before.status !== 'locked') {
      haptics.locked();
    }
    if (after.status === 'caught') {
      logCatch({
        noradId: pass.noradId,
        observedAt: after.caughtAt,
        angleError: Math.round(after.angleError * 10) / 10,
      });
      if (pass.rarity === 'rare' || pass.rarity === 'legendary') {
        haptics.bigCatch();
      } else {
        haptics.caught();
      }
    }
  };

  const tick = () => {
    const now = clock.now();
    const before = machine.current();
    if (now >= pass.endAt) {
      machine.passEnded();
      followTransition(before);
      return;
    }
    const error = aimError(readAim(), pass.track, Math.max(now, pass.startAt));
    latestError = error;
    const counts = aimCounts({ mode: readMode(), touching, error, now, startAt: pass.startAt });
    machine.aim(counts && error !== null ? error : Number.POSITIVE_INFINITY, now);
    followTransition(before);
  };

  let pulseTimer: ReturnType<typeof setTimeout> | null = null;
  const pulse = () => {
    const aiming = readMode() !== 'manual' || touching;
    const interval = aiming ? pulseInterval(latestError) : null;
    if (interval !== null) {
      haptics.aimPulse();
    }
    pulseTimer = setTimeout(pulse, interval ?? IDLE_PULSE_MS);
  };

  machine.start({ noradId: pass.noradId, passEndAt: pass.endAt }, clock.now());
  const aimTimer = setInterval(tick, AIM_TICK_MS);
  pulse();

  return {
    setTouching: (next) => {
      touching = next;
    },
    stop: () => {
      clearInterval(aimTimer);
      if (pulseTimer) {
        clearTimeout(pulseTimer);
      }
      machine.reset();
    },
  };
}
