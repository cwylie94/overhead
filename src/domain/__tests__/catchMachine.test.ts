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

describe('catch state machine', () => {
  test('a 2 second hold on target catches the satellite', () => {
    const state = run([start, aim(ON, 100), aim(ON, 100 + CATCH_HOLD_MS)]);

    expect(state).toEqual({
      status: 'caught',
      target,
      caughtAt: T0 + 100 + CATCH_HOLD_MS,
      angleError: ON,
    });
  });

  test('the boundary of the tolerance counts as on target', () => {
    expect(run([start, aim(CATCH_TOLERANCE_DEGREES, 0)]).status).toBe('locked');
  });

  test('holding for just under 2 seconds stays locked', () => {
    const state = run([start, aim(ON, 0), aim(ON, CATCH_HOLD_MS - 1)]);

    expect(state).toEqual({ status: 'locked', target, lockedAt: T0 });
  });

  test('drifting off target resets the hold', () => {
    const state = run([
      start,
      aim(ON, 0),
      aim(OFF, 1_500),
      aim(ON, 1_600),
      aim(ON, 1_600 + CATCH_HOLD_MS - 1),
    ]);

    expect(state).toEqual({ status: 'locked', target, lockedAt: T0 + 1_600 });
  });

  test('aiming off target keeps aiming', () => {
    expect(run([start, aim(OFF, 0), aim(OFF, 500)])).toEqual({ status: 'aiming', target });
  });

  test.each<[string, CatchEvent[]]>([
    ['while aiming', [start]],
    ['while locked', [start, aim(ON, 0)]],
  ])('the pass ending %s fails the catch', (_, events) => {
    expect(run([...events, { type: 'passEnded' }])).toEqual({ status: 'failed', target });
  });

  test('an aim reading after the pass ends fails instead of catching', () => {
    const shortPass: CatchTarget = { noradId: 25544, passEndAt: T0 + 1_000 };
    const state = run([
      { type: 'start', target: shortPass, at: T0 },
      aim(ON, 0),
      aim(ON, CATCH_HOLD_MS),
    ]);

    expect(state).toEqual({ status: 'failed', target: shortPass });
  });

  test('reset returns to idle from any state', () => {
    const states = [
      run([start]),
      run([start, aim(ON, 0)]),
      run([start, aim(ON, 0), aim(ON, CATCH_HOLD_MS)]),
      run([start, { type: 'passEnded' }]),
    ];

    for (const state of states) {
      expect(transition(state, { type: 'reset' })).toBe(IDLE);
    }
  });

  test('progress fills while locked and is full once caught', () => {
    const locked = run([start, aim(ON, 0)]);

    expect(holdProgress(run([start]), T0 + 500)).toBe(0);
    expect(holdProgress(locked, T0 + CATCH_HOLD_MS / 2)).toBe(0.5);
    expect(holdProgress(locked, T0 + CATCH_HOLD_MS * 3)).toBe(1);
    expect(holdProgress(run([start, aim(ON, 0), aim(ON, CATCH_HOLD_MS)]), T0)).toBe(1);
  });

  describe('forbidden transitions leave the state untouched', () => {
    const caught = run([start, aim(ON, 0), aim(ON, CATCH_HOLD_MS)]);
    const failed = run([start, { type: 'passEnded' }]);
    const locked = run([start, aim(ON, 0)]);
    const aiming = run([start]);

    test.each<[string, CatchState, CatchEvent]>([
      ['aim while idle', IDLE, aim(ON, 0)],
      ['pass ending while idle', IDLE, { type: 'passEnded' }],
      ['starting after the pass ended', IDLE, { type: 'start', target, at: target.passEndAt }],
      ['starting while aiming', aiming, start],
      ['starting while locked', locked, start],
      ['aiming after a catch', caught, aim(OFF, CATCH_HOLD_MS + 10)],
      ['starting after a catch', caught, start],
      ['pass ending after a catch', caught, { type: 'passEnded' }],
      ['aiming after a failure', failed, aim(ON, 10)],
      ['starting after a failure', failed, start],
      ['reset while idle', IDLE, { type: 'reset' }],
    ])('%s', (_, state, event) => {
      expect(transition(state, event)).toBe(state);
    });
  });
});
