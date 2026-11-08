import { create } from 'zustand';

import {
  IDLE,
  transition,
  type CatchEvent,
  type CatchState,
  type CatchTarget,
} from '@/domain/catchMachine';

type CatchStoreState = {
  machine: CatchState;
};

type CatchActions = {
  start(target: CatchTarget, at: number): void;
  aim(angleError: number, at: number): void;
  passEnded(): void;
  reset(): void;
};

export const useCatchStore = create<CatchStoreState & CatchActions>()((set) => {
  const send = (event: CatchEvent) =>
    set((state) => {
      const machine = transition(state.machine, event);
      return machine === state.machine ? state : { machine };
    });

  return {
    machine: IDLE,

    start: (target, at) => send({ type: 'start', target, at }),
    aim: (angleError, at) => send({ type: 'aim', angleError, at }),
    passEnded: () => send({ type: 'passEnded' }),
    reset: () => send({ type: 'reset' }),
  };
});
