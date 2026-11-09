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

async function emit(reading: HeadingReading) {
  await act(async () => mockListener!(reading));
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
  test('stays pointing north while the compass is off', async () => {
    const { result } = await renderHeading(false);

    expect(result.current.get()).toBe(0);
    expect(Location.watchHeadingAsync).not.toHaveBeenCalled();
  });

  test('turns with the true heading, or the magnetic one without it', async () => {
    const { result } = await renderHeading(true);

    await emit({ trueHeading: 120, magHeading: 118 });
    expect(result.current.get()).toBe(120);

    await emit({ trueHeading: -1, magHeading: 95 });
    expect(result.current.get()).toBe(95);
  });

  test('turns the short way across north', async () => {
    const { result } = await renderHeading(true);

    await emit({ trueHeading: 10, magHeading: 10 });
    await emit({ trueHeading: 350, magHeading: 350 });

    expect(result.current.get()).toBe(-10);
  });

  test('settles on the nearest whole turn when the compass is switched off', async () => {
    const { result, rerender } = await renderHeading(true);
    for (const heading of [90, 180, 270, 350, 10]) {
      await emit({ trueHeading: heading, magHeading: heading });
    }
    expect(result.current.get()).toBe(370);

    await act(async () => rerender({ on: false }));

    expect(result.current.get()).toBe(360);
    expect(mockRemove).toHaveBeenCalled();
  });

  test('carries on without a compass', async () => {
    jest.mocked(Location.watchHeadingAsync).mockRejectedValue(new Error('no compass'));

    const { result } = await renderHeading(true);

    expect(result.current.get()).toBe(0);
  });

  test('drops a compass that starts after the view has gone', async () => {
    let start!: () => void;
    jest.mocked(Location.watchHeadingAsync).mockImplementation(
      () =>
        new Promise((resolve) => {
          start = () => resolve({ remove: mockRemove });
        }),
    );
    const { unmount } = await renderHeading(true);

    await act(async () => unmount());
    await act(async () => start());

    expect(mockRemove).toHaveBeenCalled();
  });
});
