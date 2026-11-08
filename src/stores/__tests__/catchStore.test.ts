import { CATCH_HOLD_MS, IDLE, type CatchTarget } from '@/domain/catchMachine';

import { useCatchStore } from '../catchStore';

const T0 = Date.UTC(2026, 10, 8, 21, 14);
const target: CatchTarget = { noradId: 25544, passEndAt: T0 + 60_000 };

beforeEach(() => {
  useCatchStore.setState(useCatchStore.getInitialState());
});

describe('catch store', () => {
  test('runs a catch through the state machine', () => {
    const { start, aim } = useCatchStore.getState();

    start(target, T0);
    expect(useCatchStore.getState().machine.status).toBe('aiming');

    aim(4, T0 + 100);
    expect(useCatchStore.getState().machine.status).toBe('locked');

    aim(5, T0 + 100 + CATCH_HOLD_MS);
    expect(useCatchStore.getState().machine).toMatchObject({ status: 'caught', angleError: 5 });
  });

  test('a pass ending fails the catch and reset returns to idle', () => {
    useCatchStore.getState().start(target, T0);
    useCatchStore.getState().passEnded();
    expect(useCatchStore.getState().machine.status).toBe('failed');

    useCatchStore.getState().reset();
    expect(useCatchStore.getState().machine).toBe(IDLE);
  });

  test('aim readings that change nothing do not notify subscribers', () => {
    const listener = jest.fn();
    useCatchStore.getState().start(target, T0);
    const unsubscribe = useCatchStore.subscribe(listener);

    for (let frame = 0; frame < 60; frame++) {
      useCatchStore.getState().aim(30, T0 + frame * 16);
    }
    useCatchStore.getState().aim(4, T0 + 1_000);
    for (let frame = 0; frame < 60; frame++) {
      useCatchStore.getState().aim(4, T0 + 1_000 + frame * 16);
    }

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  test('forbidden events leave the store untouched', () => {
    const listener = jest.fn();
    const unsubscribe = useCatchStore.subscribe(listener);

    useCatchStore.getState().aim(1, T0);
    useCatchStore.getState().passEnded();
    useCatchStore.getState().reset();

    expect(listener).not.toHaveBeenCalled();
    expect(useCatchStore.getState().machine).toBe(IDLE);
    unsubscribe();
  });
});
