import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

import { repositories } from '@/data/client';
import type { UpcomingPass } from '@/data/queries';
import { logSighting } from '@/data/sightings/logSighting';
import { aimError } from '@/domain/sky';
import { useClock } from '@/environment/clock';
import { useCatchStore } from '@/stores/catchStore';

import { pulseInterval } from './pointing';
import type { Pointing } from './usePointing';

const AIM_TICK_MS = 50;

export function useCatchSession(pass: UpcomingPass, pointing: Pointing) {
  const clock = useClock();
  const machine = useCatchStore((state) => state.machine);
  const start = useCatchStore((state) => state.start);
  const aim = useCatchStore((state) => state.aim);
  const passEnded = useCatchStore((state) => state.passEnded);
  const reset = useCatchStore((state) => state.reset);
  const holding = useRef(false);
  const latestError = useRef<number | null>(null);
  const logged = useRef(false);
  const [sawIt, setSawIt] = useState(false);

  useEffect(() => {
    start({ noradId: pass.noradId, passEndAt: pass.endAt }, clock.now());
    logged.current = false;
    return () => reset();
  }, [pass.noradId, pass.endAt, start, reset, clock]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = clock.now();
      if (now >= pass.endAt) {
        passEnded();
        return;
      }
      const error = aimError(pointing.latest.current, pass.track, now);
      latestError.current = error;
      aim(holding.current && error !== null ? error : Number.POSITIVE_INFINITY, now);
    }, AIM_TICK_MS);
    return () => clearInterval(timer);
  }, [pass.endAt, pass.track, pointing.latest, aim, passEnded, clock]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pulse = () => {
      const interval = holding.current ? pulseInterval(latestError.current) : null;
      if (interval !== null) {
        Haptics.selectionAsync().catch(() => {});
      }
      timer = setTimeout(pulse, interval ?? 200);
    };
    pulse();
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  useEffect(() => {
    if (machine.status === 'locked') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    if (machine.status === 'caught' && !logged.current) {
      logged.current = true;
      logSighting(
        repositories,
        {
          noradId: pass.noradId,
          observedAt: machine.caughtAt,
          verified: true,
          angleError: Math.round(machine.angleError * 10) / 10,
        },
        { now: clock.now(), randomBytes: Crypto.getRandomBytes },
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [machine, pass.noradId, clock]);

  const logSawIt = useCallback(() => {
    if (logged.current) {
      return;
    }
    logged.current = true;
    const now = clock.now();
    logSighting(
      repositories,
      { noradId: pass.noradId, observedAt: now, verified: false, angleError: null },
      { now, randomBytes: Crypto.getRandomBytes },
    );
    setSawIt(true);
  }, [pass.noradId, clock]);

  return {
    machine,
    sawIt,
    setHolding: (value: boolean) => {
      holding.current = value;
    },
    logSawIt,
  };
}
