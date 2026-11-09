import { CATCH_HOLD_MS, IDLE, type CatchTarget } from '@/domain/catchMachine';

import { useCatchStore } from '../catchStore';

const T0 = Date.UTC(2026, 10, 8, 21, 14);
const target: CatchTarget = { noradId: 25544, passEndAt: T0 + 60_000 };

beforeEach(() => {
  useCatchStore.setState(useCatchStore.getInitialState());
});

describe('useCatchStore', () => {
  describe('given no catch has started', () => {
    describe('when the user starts a catch', () => {
      beforeEach(() => {
        useCatchStore.getState().start(target, T0);
      });

      test('then it is aiming', () => {
        expect(useCatchStore.getState().machine.status).toBe('aiming');
      });
    });
  });

  describe('given the user is aiming', () => {
    beforeEach(() => {
      useCatchStore.getState().start(target, T0);
    });

    describe('when the user aims close to the satellite', () => {
      beforeEach(() => {
        useCatchStore.getState().aim(4, T0 + 100);
      });

      test('then it is locked', () => {
        expect(useCatchStore.getState().machine.status).toBe('locked');
      });
    });

    describe('when the pass ends', () => {
      beforeEach(() => {
        useCatchStore.getState().passEnded();
      });

      test('then the catch fails', () => {
        expect(useCatchStore.getState().machine.status).toBe('failed');
      });
    });
  });

  describe('given the aim is locked', () => {
    beforeEach(() => {
      useCatchStore.getState().start(target, T0);
      useCatchStore.getState().aim(4, T0 + 100);
    });

    describe('when the user holds the aim for the hold time', () => {
      beforeEach(() => {
        useCatchStore.getState().aim(5, T0 + 100 + CATCH_HOLD_MS);
      });

      test('then the satellite is caught with the last angle error', () => {
        expect(useCatchStore.getState().machine).toMatchObject({
          status: 'caught',
          angleError: 5,
        });
      });
    });
  });

  describe('given the catch has failed', () => {
    beforeEach(() => {
      useCatchStore.getState().start(target, T0);
      useCatchStore.getState().passEnded();
    });

    describe('when the catch is reset', () => {
      beforeEach(() => {
        useCatchStore.getState().reset();
      });

      test('then it returns to idle', () => {
        expect(useCatchStore.getState().machine).toBe(IDLE);
      });
    });
  });

  describe('given the user is aiming and a subscriber is listening', () => {
    const listener = jest.fn();
    let unsubscribe: () => void;

    beforeEach(() => {
      listener.mockClear();
      useCatchStore.getState().start(target, T0);
      unsubscribe = useCatchStore.subscribe(listener);
    });

    afterEach(() => {
      unsubscribe();
    });

    describe('when aim readings arrive every frame and only one of them locks', () => {
      beforeEach(() => {
        for (let frame = 0; frame < 60; frame++) {
          useCatchStore.getState().aim(30, T0 + frame * 16);
        }
        useCatchStore.getState().aim(4, T0 + 1_000);
        for (let frame = 0; frame < 60; frame++) {
          useCatchStore.getState().aim(4, T0 + 1_000 + frame * 16);
        }
      });

      test('then the subscriber is notified only once', () => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given no catch has started and a subscriber is listening', () => {
    const listener = jest.fn();
    let unsubscribe: () => void;

    beforeEach(() => {
      listener.mockClear();
      unsubscribe = useCatchStore.subscribe(listener);
    });

    afterEach(() => {
      unsubscribe();
    });

    describe('when the forbidden events aim, pass ended and reset arrive', () => {
      beforeEach(() => {
        useCatchStore.getState().aim(1, T0);
        useCatchStore.getState().passEnded();
        useCatchStore.getState().reset();
      });

      test('then the subscriber is not notified', () => {
        expect(listener).not.toHaveBeenCalled();
      });

      test('then it stays idle', () => {
        expect(useCatchStore.getState().machine).toBe(IDLE);
      });
    });
  });
});
