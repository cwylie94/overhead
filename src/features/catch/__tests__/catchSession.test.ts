import {
  CATCH_HOLD_MS,
  IDLE,
  transition,
  type CatchEvent,
  type CatchState,
} from '@/domain/catchMachine';
import type { SkyPosition } from '@/domain/sky';

import {
  AIM_TICK_MS,
  startCatchSession,
  type CatchHaptics,
  type CatchMachine,
  type CatchPass,
  type RunningCatch,
} from '../catchSession';
import type { PointingMode } from '../usePointing';

const START = Date.UTC(2026, 10, 8, 20, 0);
const MINUTE = 60_000;
const TARGET = { azimuth: 180, elevation: 45 };
const AWAY = { azimuth: 0, elevation: 45 };

function makePass(overrides: Partial<CatchPass> = {}): CatchPass {
  return {
    noradId: 25544,
    startAt: START,
    endAt: START + 4 * MINUTE,
    track: [
      { time: START - MINUTE, ...TARGET },
      { time: START + 5 * MINUTE, ...TARGET },
    ],
    rarity: 'common',
    ...overrides,
  };
}

function memoryMachine(): CatchMachine {
  let state: CatchState = IDLE;
  const send = (event: CatchEvent) => {
    state = transition(state, event);
  };
  return {
    current: () => state,
    start: (target, at) => send({ type: 'start', target, at }),
    aim: (angleError, at) => send({ type: 'aim', angleError, at }),
    passEnded: () => send({ type: 'passEnded' }),
    reset: () => send({ type: 'reset' }),
  };
}

let now: number;
let machine: CatchMachine;
let haptics: jest.Mocked<CatchHaptics>;
let logCatch: jest.Mock;
let session: RunningCatch;

function startAt(
  time: number,
  { pass = makePass(), aim = TARGET, mode = 'sensors' as PointingMode } = {},
) {
  now = time;
  session = startCatchSession({
    pass,
    clock: { now: () => now },
    machine,
    haptics,
    readAim: (): SkyPosition => aim,
    readMode: () => mode,
    logCatch,
  });
}

function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += AIM_TICK_MS) {
    now += AIM_TICK_MS;
    jest.advanceTimersByTime(AIM_TICK_MS);
  }
}

beforeEach(() => {
  jest.useFakeTimers();
  machine = memoryMachine();
  haptics = { aimPulse: jest.fn(), locked: jest.fn(), caught: jest.fn(), bigCatch: jest.fn() };
  logCatch = jest.fn();
});

afterEach(() => {
  session.stop();
  jest.useRealTimers();
});

describe('startCatchSession', () => {
  describe('given a common pass under way and the sensors aimed at it', () => {
    beforeEach(() => {
      startAt(START);
    });

    test('then it starts aiming', () => {
      expect(machine.current().status).toBe('aiming');
    });

    describe('when the first tick passes', () => {
      beforeEach(() => {
        advance(AIM_TICK_MS);
      });

      test('then it locks on', () => {
        expect(machine.current().status).toBe('locked');
      });

      test('then it plays the locked haptic', () => {
        expect(haptics.locked).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given the sensors have locked on to a common pass', () => {
    beforeEach(() => {
      startAt(START);
      advance(AIM_TICK_MS);
    });

    describe('when the hold time passes', () => {
      beforeEach(() => {
        advance(CATCH_HOLD_MS);
      });

      test('then it catches the satellite', () => {
        expect(machine.current().status).toBe('caught');
      });

      test('then it plays the locked haptic only once', () => {
        expect(haptics.locked).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given the sensors have just caught a common pass', () => {
    beforeEach(() => {
      startAt(START);
      advance(AIM_TICK_MS);
      advance(CATCH_HOLD_MS);
    });

    describe('when more ticks pass', () => {
      beforeEach(() => {
        advance(10 * AIM_TICK_MS);
      });

      test('then it logs one catch, at the moment it was caught', () => {
        expect(logCatch.mock.calls).toEqual([
          [{ noradId: 25544, observedAt: START + AIM_TICK_MS + CATCH_HOLD_MS, angleError: 0 }],
        ]);
      });

      test('then it plays the caught haptic once', () => {
        expect(haptics.caught).toHaveBeenCalledTimes(1);
      });

      test('then it doesn’t play the big catch haptic', () => {
        expect(haptics.bigCatch).not.toHaveBeenCalled();
      });
    });
  });

  describe('given a rare pass under way and the sensors aimed at it', () => {
    beforeEach(() => {
      startAt(START, { pass: makePass({ rarity: 'rare' }) });
    });

    describe('when the hold time passes', () => {
      beforeEach(() => {
        advance(CATCH_HOLD_MS + 2 * AIM_TICK_MS);
      });

      test('then it celebrates with the big catch haptic', () => {
        expect(haptics.bigCatch).toHaveBeenCalledTimes(1);
      });

      test('then it doesn’t play the ordinary caught haptic', () => {
        expect(haptics.caught).not.toHaveBeenCalled();
      });
    });
  });

  describe('given a pass under way and the sensors pointed away from it', () => {
    beforeEach(() => {
      startAt(START, { aim: AWAY });
    });

    describe('when the hold time passes', () => {
      beforeEach(() => {
        advance(CATCH_HOLD_MS + 2 * AIM_TICK_MS);
      });

      test('then it keeps aiming', () => {
        expect(machine.current().status).toBe('aiming');
      });

      test('then it logs no catch', () => {
        expect(logCatch).not.toHaveBeenCalled();
      });
    });
  });

  describe('given the pass starts in a minute and the sensors are aimed at it', () => {
    beforeEach(() => {
      startAt(START - MINUTE);
    });

    describe('when the hold time passes', () => {
      beforeEach(() => {
        advance(CATCH_HOLD_MS + 2 * AIM_TICK_MS);
      });

      test('then the aim doesn’t count yet', () => {
        expect(machine.current().status).toBe('aiming');
      });
    });
  });

  describe('given drag-to-aim on the satellite with no finger down', () => {
    beforeEach(() => {
      startAt(START, { mode: 'manual' });
    });

    describe('when the hold time passes', () => {
      beforeEach(() => {
        advance(CATCH_HOLD_MS + 2 * AIM_TICK_MS);
      });

      test('then it keeps aiming', () => {
        expect(machine.current().status).toBe('aiming');
      });

      test('then it doesn’t pulse the aim', () => {
        expect(haptics.aimPulse).not.toHaveBeenCalled();
      });
    });
  });

  describe('given drag-to-aim on the satellite and the user puts a finger down after a hold without one', () => {
    beforeEach(() => {
      startAt(START, { mode: 'manual' });
      advance(CATCH_HOLD_MS + 2 * AIM_TICK_MS);
      session.setTouching(true);
    });

    describe('when the hold time passes', () => {
      beforeEach(() => {
        advance(CATCH_HOLD_MS + 2 * AIM_TICK_MS);
      });

      test('then it catches the satellite', () => {
        expect(machine.current().status).toBe('caught');
      });

      test('then it pulses the aim', () => {
        expect(haptics.aimPulse).toHaveBeenCalled();
      });
    });
  });

  describe('given the pass is a tick from ending and the sensors are pointed away', () => {
    beforeEach(() => {
      startAt(START + 4 * MINUTE - AIM_TICK_MS, { aim: AWAY });
    });

    describe('when the pass ends', () => {
      beforeEach(() => {
        advance(2 * AIM_TICK_MS);
      });

      test('then the catch fails', () => {
        expect(machine.current().status).toBe('failed');
      });
    });
  });

  describe('given a session that has locked on', () => {
    beforeEach(() => {
      startAt(START);
      advance(AIM_TICK_MS);
    });

    describe('when it stops and the hold time passes', () => {
      beforeEach(() => {
        session.stop();
        advance(CATCH_HOLD_MS + 2 * AIM_TICK_MS);
      });

      test('then the catch is reset', () => {
        expect(machine.current().status).toBe('idle');
      });

      test('then nothing is caught', () => {
        expect(logCatch).not.toHaveBeenCalled();
      });
    });
  });
});
