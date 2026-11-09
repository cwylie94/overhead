import * as Crypto from 'expo-crypto';
import { useEffect, useRef } from 'react';

import { useAppData } from '@/data/AppDataContext';
import type { UpcomingPass } from '@/data/queries';
import { logSighting } from '@/data/sightings/logSighting';
import { useClock } from '@/environment/clock';
import { useCatchStore } from '@/stores/catchStore';
import { haptics } from '@/ui/haptics';

import { startCatchSession, type CatchMachine, type RunningCatch } from './catchSession';
import type { Pointing } from './usePointing';

const storeMachine: CatchMachine = {
  current: () => useCatchStore.getState().machine,
  start: (target, at) => useCatchStore.getState().start(target, at),
  aim: (angleError, at) => useCatchStore.getState().aim(angleError, at),
  passEnded: () => useCatchStore.getState().passEnded(),
  reset: () => useCatchStore.getState().reset(),
};

export function useCatchSession(pass: UpcomingPass, pointing: Pointing) {
  const { repositories } = useAppData();
  const clock = useClock();
  const machine = useCatchStore((state) => state.machine);
  const latestPass = useRef(pass);
  const mode = useRef(pointing.mode);
  const running = useRef<RunningCatch | null>(null);
  const { latest } = pointing;

  useEffect(() => {
    latestPass.current = pass;
    mode.current = pointing.mode;
  });

  useEffect(() => {
    const session = startCatchSession({
      pass: latestPass.current,
      clock,
      machine: storeMachine,
      haptics,
      readAim: () => latest.current,
      readMode: () => mode.current,
      logCatch: (sighting) =>
        logSighting(repositories, sighting, {
          now: clock.now(),
          randomBytes: Crypto.getRandomBytes,
        }),
    });
    running.current = session;
    return () => session.stop();
  }, [pass.id, clock, repositories, latest]);

  return {
    machine,
    setTouching: (touching: boolean) => running.current?.setTouching(touching),
  };
}
