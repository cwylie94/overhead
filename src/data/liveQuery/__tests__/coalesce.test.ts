import { coalesce } from '../coalesce';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('coalesce', () => {
  test('runs once after a burst of triggers settles', () => {
    const run = jest.fn();
    const reload = coalesce(run, 50, 500);

    for (let row = 0; row < 400; row++) {
      reload.trigger();
    }
    expect(run).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(run).toHaveBeenCalledTimes(1);
  });

  test('waits for quiet before running', () => {
    const run = jest.fn();
    const reload = coalesce(run, 50, 500);

    reload.trigger();
    jest.advanceTimersByTime(40);
    reload.trigger();
    jest.advanceTimersByTime(40);

    expect(run).not.toHaveBeenCalled();
    jest.advanceTimersByTime(10);
    expect(run).toHaveBeenCalledTimes(1);
  });

  test('still runs during a long stream of changes', () => {
    const run = jest.fn();
    const reload = coalesce(run, 50, 500);

    for (let elapsed = 0; elapsed < 600; elapsed += 20) {
      reload.trigger();
      jest.advanceTimersByTime(20);
    }

    expect(run).toHaveBeenCalledTimes(1);
  });

  test('runs again for changes after the last run', () => {
    const run = jest.fn();
    const reload = coalesce(run, 50, 500);

    reload.trigger();
    jest.advanceTimersByTime(50);
    reload.trigger();
    jest.advanceTimersByTime(50);

    expect(run).toHaveBeenCalledTimes(2);
  });

  test('does nothing once cancelled', () => {
    const run = jest.fn();
    const reload = coalesce(run, 50, 500);

    reload.trigger();
    reload.cancel();
    jest.advanceTimersByTime(1_000);

    expect(run).not.toHaveBeenCalled();
  });
});
