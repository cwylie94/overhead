import { type Coalesced, coalesce } from '../coalesce';

let run: jest.Mock;
let reload: Coalesced;

function startCoalescing() {
  run = jest.fn();
  reload = coalesce(run, 50, 500);
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('coalesce', () => {
  describe('given nothing has been triggered', () => {
    beforeEach(() => {
      startCoalescing();
    });

    describe('when a burst of 400 triggers arrives', () => {
      beforeEach(() => {
        for (let row = 0; row < 400; row++) {
          reload.trigger();
        }
      });

      test('then it has not run yet', () => {
        expect(run).not.toHaveBeenCalled();
      });
    });

    describe('when triggers keep arriving every 20 ms for 600 ms', () => {
      beforeEach(() => {
        for (let elapsed = 0; elapsed < 600; elapsed += 20) {
          reload.trigger();
          jest.advanceTimersByTime(20);
        }
      });

      test('then it still runs once', () => {
        expect(run).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given a burst of 400 triggers', () => {
    beforeEach(() => {
      startCoalescing();
      for (let row = 0; row < 400; row++) {
        reload.trigger();
      }
    });

    describe('when the burst settles', () => {
      beforeEach(() => {
        jest.advanceTimersByTime(50);
      });

      test('then it runs once', () => {
        expect(run).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given a second trigger 40 ms after the first', () => {
    beforeEach(() => {
      startCoalescing();
      reload.trigger();
      jest.advanceTimersByTime(40);
      reload.trigger();
    });

    describe('when another 40 ms pass', () => {
      beforeEach(() => {
        jest.advanceTimersByTime(40);
      });

      test('then it has not run yet', () => {
        expect(run).not.toHaveBeenCalled();
      });
    });
  });

  describe('given a second trigger 40 ms after the first and 40 ms of quiet since', () => {
    beforeEach(() => {
      startCoalescing();
      reload.trigger();
      jest.advanceTimersByTime(40);
      reload.trigger();
      jest.advanceTimersByTime(40);
    });

    describe('when 10 more ms pass', () => {
      beforeEach(() => {
        jest.advanceTimersByTime(10);
      });

      test('then it runs once', () => {
        expect(run).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given it has run for a trigger', () => {
    beforeEach(() => {
      startCoalescing();
      reload.trigger();
      jest.advanceTimersByTime(50);
    });

    describe('when another trigger settles', () => {
      beforeEach(() => {
        reload.trigger();
        jest.advanceTimersByTime(50);
      });

      test('then it runs again', () => {
        expect(run).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('given a trigger that was then cancelled', () => {
    beforeEach(() => {
      startCoalescing();
      reload.trigger();
      reload.cancel();
    });

    describe('when a second passes', () => {
      beforeEach(() => {
        jest.advanceTimersByTime(1_000);
      });

      test('then it does not run', () => {
        expect(run).not.toHaveBeenCalled();
      });
    });
  });
});
