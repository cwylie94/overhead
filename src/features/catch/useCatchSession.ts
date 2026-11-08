import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppData } from '@/data/AppDataContext';
import type { UpcomingPass } from '@/data/queries';
import { logSighting } from '@/data/sightings/logSighting';
import { aimError } from '@/domain/sky';
import { useClock } from '@/environment/clock';
import { useCatchStore } from '@/stores/catchStore';
import { haptics } from '@/ui/haptics';

import { pulseInterval } from './pointing';
import type { Pointing } from './usePointing';

const AIM_TICK_MS = 50;

export function useCatchSession(pass: UpcomingPass, pointing: Pointing) {
  const { repositories } = useAppData();
  const clock = useClock();
  const machine = useCatchStore((state) => state.machine);
  const start = useCatchStore((state) => state.start);
  const aim = useCatchStore((state) => state.aim);
  const passEnded = useCatchStore((state) => state.passEnded);
  const reset = useCatchStore((state) => state.reset);
  const holding = useRef(false);
  const latestError = useRef<number | null>(null);
  const loggedCatchAt = useRef<number | null>(null);
  const loggedSawIt = useRef(false);
  const [sawIt, setSawIt] = useState(false);

  useEffect(() => {
    start({ noradId: pass.noradId, passEndAt: pass.endAt }, clock.now());
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
        haptics.aimPulse();
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
      haptics.locked();
    }
    if (machine.status === 'caught' && loggedCatchAt.current !== machine.caughtAt) {
      loggedCatchAt.current = machine.caughtAt;
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
      haptics.caught();
    }
  }, [machine, pass.noradId, clock, repositories]);

  const logSawIt = useCallback(() => {
    if (loggedSawIt.current || loggedCatchAt.current !== null) {
      return;
    }
    loggedSawIt.current = true;
    const now = clock.now();
    logSighting(
      repositories,
      { noradId: pass.noradId, observedAt: now, verified: false, angleError: null },
      { now, randomBytes: Crypto.getRandomBytes },
    );
    setSawIt(true);
  }, [pass.noradId, clock, repositories]);

  return {
    machine,
    sawIt,
    setHolding: (value: boolean) => {
      holding.current = value;
    },
    logSawIt,
  };
}
