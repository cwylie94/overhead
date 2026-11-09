import {
  CATCH_HOLD_MS,
  CATCH_TOLERANCE_DEGREES,
  holdProgress,
  IDLE,
  transition,
  type CatchEvent,
  type CatchState,
  type CatchTarget,
} from '../catchMachine';

const T0 = Date.UTC(2026, 10, 8, 21, 14);
const target: CatchTarget = { noradId: 25544, passEndAt: T0 + 60_000 };
const SHORT_PASS: CatchTarget = { noradId: 25544, passEndAt: T0 + 1_000 };
const ON = CATCH_TOLERANCE_DEGREES - 1;
const OFF = CATCH_TOLERANCE_DEGREES + 1;

function run(events: CatchEvent[], from: CatchState = IDLE): CatchState {
  return events.reduce(transition, from);
}

const start: CatchEvent = { type: 'start', target, at: T0 };
const aim = (angleError: number, offset: number): CatchEvent => ({
  type: 'aim',
  angleError,
  at: T0 + offset,
});
const PASS_ENDED: CatchEvent = { type: 'passEnded' };
const RESET: CatchEvent = { type: 'reset' };

const AIMING = [start];
const LOCKED = [start, aim(ON, 0)];
const CAUGHT = [start, aim(ON, 0), aim(ON, CATCH_HOLD_MS)];
const FAILED = [start, PASS_ENDED];

describe('transition', () => {
  let state: CatchState;
  let next: CatchState;

  describe('given the catch is idle', () => {
    beforeEach(() => {
      state = IDLE;
    });

    describe.each([
      { when: 'an aim reading arrives', event: aim(ON, 0) },
      { when: 'the pass ends', event: PASS_ENDED },
      {
        when: 'the user starts after the pass has ended',
        event: { type: 'start', target, at: target.passEndAt } as CatchEvent,
      },
      { when: 'the user resets', event: RESET },
    ])('when $when', ({ event }) => {
      beforeEach(() => {
        next = transition(state, event);
      });

      test('then the state is left untouched', () => {
        expect(next).toBe(state);
      });
    });
  });

  describe('given the user is aiming', () => {
    beforeEach(() => {
      state = run(AIMING);
    });

    describe('when the user aims exactly at the edge of the tolerance', () => {
      beforeEach(() => {
        next = transition(state, aim(CATCH_TOLERANCE_DEGREES, 0));
      });

      test('then it locks on, because the edge counts as on target', () => {
        expect(next.status).toBe('locked');
      });
    });

    describe('when the pass ends', () => {
      beforeEach(() => {
        next = transition(state, PASS_ENDED);
      });

      test('then the catch fails', () => {
        expect(next).toEqual({ status: 'failed', target });
      });
    });

    describe('when the user resets', () => {
      beforeEach(() => {
        next = transition(state, RESET);
      });

      test('then it returns to idle', () => {
        expect(next).toBe(IDLE);
      });
    });

    describe('when the user starts again', () => {
      beforeEach(() => {
        next = transition(state, start);
      });

      test('then the state is left untouched', () => {
        expect(next).toBe(state);
      });
    });
  });

  describe('given the user is aiming off target', () => {
    beforeEach(() => {
      state = run([start, aim(OFF, 0)]);
    });

    describe('when a reading half a second later is still off target', () => {
      beforeEach(() => {
        next = transition(state, aim(OFF, 500));
      });

      test('then it keeps aiming', () => {
        expect(next).toEqual({ status: 'aiming', target });
      });
    });
  });

  describe('given the user locked on 100 ms into the catch', () => {
    beforeEach(() => {
      state = run([start, aim(ON, 100)]);
    });

    describe('when the user is still on target 3 seconds later', () => {
      beforeEach(() => {
        next = transition(state, aim(ON, 100 + CATCH_HOLD_MS));
      });

      test('then the satellite is caught', () => {
        expect(next).toEqual({
          status: 'caught',
          target,
          caughtAt: T0 + 100 + CATCH_HOLD_MS,
          angleError: ON,
        });
      });
    });
  });

  describe('given the user is locked on', () => {
    beforeEach(() => {
      state = run(LOCKED);
    });

    describe('when the user is still on target just under 3 seconds later', () => {
      beforeEach(() => {
        next = transition(state, aim(ON, CATCH_HOLD_MS - 1));
      });

      test('then it stays locked from when the user locked on', () => {
        expect(next).toEqual({ status: 'locked', target, lockedAt: T0 });
      });
    });

    describe('when the pass ends', () => {
      beforeEach(() => {
        next = transition(state, PASS_ENDED);
      });

      test('then the catch fails', () => {
        expect(next).toEqual({ status: 'failed', target });
      });
    });

    describe('when the user resets', () => {
      beforeEach(() => {
        next = transition(state, RESET);
      });

      test('then it returns to idle', () => {
        expect(next).toBe(IDLE);
      });
    });

    describe('when the user starts again', () => {
      beforeEach(() => {
        next = transition(state, start);
      });

      test('then the state is left untouched', () => {
        expect(next).toBe(state);
      });
    });
  });

  describe('given the user locked on, drifted off target and came back', () => {
    beforeEach(() => {
      state = run([start, aim(ON, 0), aim(OFF, 1_500), aim(ON, 1_600)]);
    });

    describe('when the user holds on target for just under 3 seconds more', () => {
      beforeEach(() => {
        next = transition(state, aim(ON, 1_600 + CATCH_HOLD_MS - 1));
      });

      test('then the hold restarts from when the user came back', () => {
        expect(next).toEqual({ status: 'locked', target, lockedAt: T0 + 1_600 });
      });
    });
  });

  describe('given the user locked on during a pass that ends a second later', () => {
    beforeEach(() => {
      state = run([{ type: 'start', target: SHORT_PASS, at: T0 }, aim(ON, 0)]);
    });

    describe('when an on-target reading arrives 3 seconds after locking on', () => {
      beforeEach(() => {
        next = transition(state, aim(ON, CATCH_HOLD_MS));
      });

      test('then the catch fails instead of catching', () => {
        expect(next).toEqual({ status: 'failed', target: SHORT_PASS });
      });
    });
  });

  describe('given the satellite was caught', () => {
    beforeEach(() => {
      state = run(CAUGHT);
    });

    describe('when the user resets', () => {
      beforeEach(() => {
        next = transition(state, RESET);
      });

      test('then it returns to idle', () => {
        expect(next).toBe(IDLE);
      });
    });

    describe.each([
      { when: 'an off-target reading arrives', event: aim(OFF, CATCH_HOLD_MS + 10) },
      { when: 'the user starts again', event: start },
      { when: 'the pass ends', event: PASS_ENDED },
    ])('when $when', ({ event }) => {
      beforeEach(() => {
        next = transition(state, event);
      });

      test('then the state is left untouched', () => {
        expect(next).toBe(state);
      });
    });
  });

  describe('given the catch failed', () => {
    beforeEach(() => {
      state = run(FAILED);
    });

    describe('when the user resets', () => {
      beforeEach(() => {
        next = transition(state, RESET);
      });

      test('then it returns to idle', () => {
        expect(next).toBe(IDLE);
      });
    });

    describe.each([
      { when: 'an on-target reading arrives', event: aim(ON, 10) },
      { when: 'the user starts again', event: start },
    ])('when $when', ({ event }) => {
      beforeEach(() => {
        next = transition(state, event);
      });

      test('then the state is left untouched', () => {
        expect(next).toBe(state);
      });
    });
  });
});

describe('holdProgress', () => {
  let state: CatchState;

  describe('given the user is aiming but not locked on', () => {
    beforeEach(() => {
      state = run(AIMING);
    });

    test('then there is no progress half a second in', () => {
      expect(holdProgress(state, T0 + 500)).toBe(0);
    });
  });

  describe('given the user is locked on', () => {
    beforeEach(() => {
      state = run(LOCKED);
    });

    test('then progress is half full halfway through the hold', () => {
      expect(holdProgress(state, T0 + CATCH_HOLD_MS / 2)).toBe(0.5);
    });

    test('then progress stops at full long after the hold', () => {
      expect(holdProgress(state, T0 + CATCH_HOLD_MS * 3)).toBe(1);
    });
  });

  describe('given the satellite was caught', () => {
    beforeEach(() => {
      state = run(CAUGHT);
    });

    test('then progress is full', () => {
      expect(holdProgress(state, T0)).toBe(1);
    });
  });
});

describe('CATCH_HOLD_MS', () => {
  describe('given the catch rules', () => {
    test('then a catch takes 3 seconds on target', () => {
      expect(CATCH_HOLD_MS).toBe(3_000);
    });
  });
});
