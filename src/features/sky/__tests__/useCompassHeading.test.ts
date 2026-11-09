import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useCompassHeading } from '../useCompassHeading';

type HeadingReading = { trueHeading: number; magHeading: number };

let mockListener: ((reading: HeadingReading) => void) | null = null;
const mockRemove = jest.fn();

jest.mock('react-native-reanimated', () => jest.requireActual('@/testing/reanimated'));

jest.mock('expo-location', () => ({
  watchHeadingAsync: jest.fn(),
}));

async function renderHeading(enabled: boolean) {
  const hook = await renderHook(({ on }: { on: boolean }) => useCompassHeading(on), {
    initialProps: { on: enabled },
  });
  await act(async () => {});
  return hook;
}

type HeadingHook = Awaited<ReturnType<typeof renderHeading>>;

async function emit(reading: HeadingReading) {
  await act(async () => mockListener!(reading));
}

async function emitHeading(heading: number) {
  await emit({ trueHeading: heading, magHeading: heading });
}

async function turnOnceRoundPastNorth() {
  for (const heading of [90, 180, 270, 350, 10]) {
    await emitHeading(heading);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListener = null;
  jest.mocked(Location.watchHeadingAsync).mockImplementation(async (listener) => {
    mockListener = listener as typeof mockListener;
    return { remove: mockRemove };
  });
});

describe('useCompassHeading', () => {
  let hook: HeadingHook;

  describe('given the compass is off', () => {
    describe('when the hook starts', () => {
      beforeEach(async () => {
        hook = await renderHeading(false);
      });

      test('then it points north', () => {
        expect(hook.result.current.get()).toBe(0);
      });

      test('then it doesn’t watch the heading', () => {
        expect(Location.watchHeadingAsync).not.toHaveBeenCalled();
      });
    });
  });

  describe('given the compass is on', () => {
    beforeEach(async () => {
      hook = await renderHeading(true);
    });

    describe('when a reading with a true heading arrives', () => {
      beforeEach(async () => {
        await emit({ trueHeading: 120, magHeading: 118 });
      });

      test('then it turns to the true heading', () => {
        expect(hook.result.current.get()).toBe(120);
      });
    });

    describe('when readings arrive turning once round past north', () => {
      beforeEach(async () => {
        await turnOnceRoundPastNorth();
      });

      test('then it carries on past a whole turn', () => {
        expect(hook.result.current.get()).toBe(370);
      });
    });
  });

  describe('given the compass is on and turned to a true heading of 120°', () => {
    beforeEach(async () => {
      hook = await renderHeading(true);
      await emit({ trueHeading: 120, magHeading: 118 });
    });

    describe('when a reading without a true heading arrives', () => {
      beforeEach(async () => {
        await emit({ trueHeading: -1, magHeading: 95 });
      });

      test('then it turns to the magnetic heading', () => {
        expect(hook.result.current.get()).toBe(95);
      });
    });
  });

  describe('given the compass is on and pointing at 10°', () => {
    beforeEach(async () => {
      hook = await renderHeading(true);
      await emitHeading(10);
    });

    describe('when a reading of 350° arrives', () => {
      beforeEach(async () => {
        await emitHeading(350);
      });

      test('then it turns the short way across north', () => {
        expect(hook.result.current.get()).toBe(-10);
      });
    });
  });

  describe('given the compass has turned once round past north', () => {
    beforeEach(async () => {
      hook = await renderHeading(true);
      await turnOnceRoundPastNorth();
    });

    describe('when the compass is switched off', () => {
      beforeEach(async () => {
        await act(async () => hook.rerender({ on: false }));
      });

      test('then it settles on the nearest whole turn', () => {
        expect(hook.result.current.get()).toBe(360);
      });

      test('then it stops watching the heading', () => {
        expect(mockRemove).toHaveBeenCalled();
      });
    });
  });

  describe('given the phone has no compass', () => {
    beforeEach(() => {
      jest.mocked(Location.watchHeadingAsync).mockRejectedValue(new Error('no compass'));
    });

    describe('when the hook starts with the compass on', () => {
      beforeEach(async () => {
        hook = await renderHeading(true);
      });

      test('then it carries on pointing north', () => {
        expect(hook.result.current.get()).toBe(0);
      });
    });
  });

  describe('given the compass is slow to start and the view has gone before it does', () => {
    let start: () => void;

    beforeEach(async () => {
      jest.mocked(Location.watchHeadingAsync).mockImplementation(
        () =>
          new Promise((resolve) => {
            start = () => resolve({ remove: mockRemove });
          }),
      );
      hook = await renderHeading(true);
      await act(async () => hook.unmount());
    });

    describe('when the compass starts', () => {
      beforeEach(async () => {
        await act(async () => start());
      });

      test('then it drops the compass', () => {
        expect(mockRemove).toHaveBeenCalled();
      });
    });
  });
});
