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
const clock = { now: () => now };
let repositories: Repositories;

function wrapper({ children }: { children: ReactNode }) {
  const data = { key: 'test', repositories } as unknown as AppData;
  return (
    <ClockProvider clock={clock}>
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
  return renderHook(() => useCatchSession({ ...pass }, pointing), { wrapper });
}

type Session = Awaited<ReturnType<typeof renderSession>>;

function startClockAt(time: number) {
  jest.useFakeTimers();
  now = time;
}

beforeEach(() => {
  jest.clearAllMocks();
  now = START;
  repositories = createRepositories(createTestDatabase());
  useCatchStore.setState(useCatchStore.getInitialState());
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useCatchSession', () => {
  let result: Session['result'];

  describe('given the sensors are aimed at a common pass under way', () => {
    beforeEach(async () => {
      startClockAt(START);
      ({ result } = await renderSession(makePass(), makePointing('sensors')));
    });

    describe('when the hold time passes', () => {
      beforeEach(async () => {
        await advance(CATCH_HOLD_MS + 2 * TICK);
      });

      test('then the screen sees the catch', () => {
        expect(result.current.machine.status).toBe('caught');
      });

      test('then it logs one sighting in the database', () => {
        expect(repositories.sightings.listAll()).toEqual([
          expect.objectContaining({ noradId: 25544, angleError: 0 }),
        ]);
      });

      test('then it plays the caught haptic', () => {
        expect(haptics.caught).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given the sensors have locked on to a pass', () => {
    let rerender: Session['rerender'];

    beforeEach(async () => {
      startClockAt(START);
      const pointing = makePointing('sensors');
      ({ result, rerender } = await renderSession(makePass(), pointing));
      await advance(TICK);
    });

    describe('when the screen renders again with a fresh copy of the same pass', () => {
      beforeEach(async () => {
        await act(() => rerender(undefined));
      });

      test('then it stays locked on', () => {
        expect(result.current.machine.status).toBe('locked');
      });
    });
  });

  describe('given drag-to-aim on the satellite', () => {
    beforeEach(async () => {
      startClockAt(START);
      ({ result } = await renderSession(makePass(), makePointing('manual')));
    });

    describe('when the user puts a finger down and holds', () => {
      beforeEach(async () => {
        await act(() => result.current.setTouching(true));
        await advance(CATCH_HOLD_MS + 2 * TICK);
      });

      test('then it catches the satellite', () => {
        expect(result.current.machine.status).toBe('caught');
      });
    });
  });

  describe('given a session that has run for a tick', () => {
    let unmount: Session['unmount'];

    beforeEach(async () => {
      startClockAt(START);
      ({ unmount } = await renderSession(makePass(), makePointing('sensors')));
      await advance(TICK);
    });

    describe('when the screen closes', () => {
      beforeEach(async () => {
        await act(() => unmount());
      });

      test('then it resets the catch', () => {
        expect(useCatchStore.getState().machine.status).toBe('idle');
      });
    });
  });
});
