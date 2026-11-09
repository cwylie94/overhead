import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AppDataProvider } from '@/data/AppDataContext';
import type { AppData } from '@/data/client';
import type { UpcomingPass } from '@/data/queries';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing/createTestDatabase';
import { CATCH_HOLD_MS } from '@/domain/catchMachine';
import type { SkyPosition } from '@/domain/sky';
import { ClockProvider } from '@/environment/clock';
import { useCatchStore } from '@/stores/catchStore';
import { haptics } from '@/ui/haptics';

import { useCatchSession } from '../useCatchSession';
import type { Pointing, PointingMode } from '../usePointing';

jest.mock('@/ui/haptics', () => ({
  haptics: {
    aimPulse: jest.fn(),
    select: jest.fn(),
    locked: jest.fn(),
    caught: jest.fn(),
    bigCatch: jest.fn(),
  },
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) => new Uint8Array(count).fill(7),
}));

const TICK = 50;
const START = Date.UTC(2026, 10, 8, 20, 0);
const MINUTE = 60_000;
const TARGET = { azimuth: 180, elevation: 45 };

function makePass(overrides: Partial<UpcomingPass> = {}): UpcomingPass {
  return {
    id: 1,
    noradId: 25544,
    startAt: START,
    peakAt: START + 2 * MINUTE,
    endAt: START + 4 * MINUTE,
    maxElevation: 45,
    peakMagnitude: -2,
    track: [
      { time: START - MINUTE, ...TARGET },
      { time: START + 5 * MINUTE, ...TARGET },
    ],
    name: 'ISS (ZARYA)',
    rarity: 'common',
    ...overrides,
  };
}

function makePointing(mode: PointingMode, aim: SkyPosition = TARGET): Pointing {
  return {
    azimuth: { get: () => aim.azimuth },
    elevation: { get: () => aim.elevation },
    roll: { get: () => 0 },
    latest: { current: aim },
    raw: { current: aim },
    mode,
    calibrate: false,
    setManual: () => {},
  } as unknown as Pointing;
}

let now = START;
let repositories: Repositories;

function wrapper({ children }: { children: ReactNode }) {
  const data = { key: 'test', repositories } as unknown as AppData;
  return (
    <ClockProvider clock={{ now: () => now }}>
      <AppDataProvider data={data}>{children}</AppDataProvider>
    </ClockProvider>
  );
}

async function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += TICK) {
    now += TICK;
    await act(async () => {
      jest.advanceTimersByTime(TICK);
    });
  }
}

async function renderSession(pass: UpcomingPass, pointing: Pointing) {
  return renderHook(() => useCatchSession(pass, pointing), { wrapper });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  now = START;
  repositories = createRepositories(createTestDatabase());
  useCatchStore.setState(useCatchStore.getInitialState());
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useCatchSession', () => {
  test('locks on, catches after the hold and logs one sighting', async () => {
    const { result } = await renderSession(makePass(), makePointing('sensors'));

    await advance(TICK);
    expect(result.current.machine.status).toBe('locked');
    expect(haptics.locked).toHaveBeenCalled();

    await advance(CATCH_HOLD_MS);
    expect(result.current.machine.status).toBe('caught');
    await advance(10 * TICK);

    expect(repositories.sightings.listAll()).toEqual([
      expect.objectContaining({ noradId: 25544, angleError: 0 }),
    ]);
    expect(haptics.caught).toHaveBeenCalledTimes(1);
    expect(haptics.bigCatch).not.toHaveBeenCalled();
  });

  test('celebrates a rare catch more strongly', async () => {
    await renderSession(makePass({ rarity: 'rare' }), makePointing('sensors'));

    await advance(CATCH_HOLD_MS + 2 * TICK);

    expect(haptics.bigCatch).toHaveBeenCalledTimes(1);
    expect(haptics.caught).not.toHaveBeenCalled();
  });

  test('keeps aiming while pointed away from the satellite', async () => {
    const { result } = await renderSession(
      makePass(),
      makePointing('sensors', { azimuth: 0, elevation: 45 }),
    );

    await advance(CATCH_HOLD_MS + 2 * TICK);

    expect(result.current.machine.status).toBe('aiming');
    expect(repositories.sightings.listAll()).toEqual([]);
  });

  test('waits for the pass to start before the aim counts', async () => {
    now = START - MINUTE;
    const { result } = await renderSession(makePass(), makePointing('sensors'));

    await advance(CATCH_HOLD_MS + 2 * TICK);

    expect(result.current.machine.status).toBe('aiming');
  });

  test('counts a dragged aim only while a finger is down', async () => {
    const { result } = await renderSession(makePass(), makePointing('manual'));

    await advance(CATCH_HOLD_MS + 2 * TICK);
    expect(result.current.machine.status).toBe('aiming');
    expect(haptics.aimPulse).not.toHaveBeenCalled();

    await act(() => result.current.setTouching(true));
    await advance(CATCH_HOLD_MS + 2 * TICK);

    expect(result.current.machine.status).toBe('caught');
    expect(haptics.aimPulse).toHaveBeenCalled();
  });

  test('fails once the pass has ended', async () => {
    now = START + 4 * MINUTE - TICK;
    const { result } = await renderSession(
      makePass(),
      makePointing('sensors', { azimuth: 0, elevation: 45 }),
    );

    await advance(2 * TICK);

    expect(result.current.machine.status).toBe('failed');
  });

  test('resets the catch when the screen closes', async () => {
    const { unmount } = await renderSession(makePass(), makePointing('sensors'));
    await advance(TICK);

    await act(() => unmount());

    expect(useCatchStore.getState().machine.status).toBe('idle');
  });
});
