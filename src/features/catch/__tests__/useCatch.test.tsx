import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { UpcomingPass } from '@/data/queries';
import { IDLE, type CatchState } from '@/domain/catchMachine';
import { ClockProvider } from '@/environment/clock';
import type { LocationState } from '@/environment/location';
import { useSessionFeatures } from '@/session/appSession';
import { DEVICE_FEATURES } from '@/session/features';
import { useChosenLocation } from '@/session/location';

import { useCameraAim } from '../useCameraAim';
import { catchPhase, startingAim, useCatch } from '../useCatch';
import { useCatchSession } from '../useCatchSession';
import { usePointing, type Pointing, type PointingMode } from '../usePointing';

jest.mock('react-native-reanimated', () => jest.requireActual('@/testing/reanimated'));
jest.mock('@/ui/motion', () => ({ ALWAYS_ANIMATE: {} }));
jest.mock('@/session/appSession', () => ({ useSessionFeatures: jest.fn() }));
jest.mock('@/session/location', () => ({ useChosenLocation: jest.fn() }));
jest.mock('@/environment/location', () => ({
  useLocation: () => ({ state: mockLocation }),
}));
jest.mock('../usePointing', () => ({ usePointing: jest.fn() }));
jest.mock('../useCatchSession', () => ({ useCatchSession: jest.fn() }));
jest.mock('../useCameraAim', () => ({ useCameraAim: jest.fn(() => 'aim') }));
jest.mock('../useAimGesture', () => ({ useAimGesture: () => 'gesture' }));

const MINUTE = 60_000;
const START = Date.UTC(2026, 10, 9, 20, 0);
const MADRID = { name: 'Madrid', country: 'Spain', latitude: 40.4, longitude: -3.7 };
const OBSERVER = { latitude: 51.5, longitude: -0.1, altitude: 0 };
const TARGET = { noradId: 25544, passEndAt: START + 4 * MINUTE };
const AIMING: CatchState = { status: 'aiming', target: TARGET };
let mockLocation: LocationState = { status: 'ready', observer: OBSERVER };
let now = START;
const clock = { now: () => now };

const PASS = {
  id: 7,
  noradId: 25544,
  name: 'ISS (ZARYA)',
  startAt: START,
  endAt: START + 4 * MINUTE,
  track: [
    { time: START, azimuth: 300, elevation: 10 },
    { time: START + 4 * MINUTE, azimuth: 300, elevation: 10 },
  ],
} as unknown as UpcomingPass;

function pointing(mode: PointingMode, calibrate = false): Pointing {
  return { mode, calibrate, azimuth: 'az', elevation: 'el', roll: 'roll' } as unknown as Pointing;
}

function wrapper({ children }: { children: ReactNode }) {
  return <ClockProvider clock={clock}>{children}</ClockProvider>;
}

async function renderCatch() {
  const { result } = await renderHook(() => useCatch(PASS), { wrapper });
  return result.current;
}

function machineIs(machine: CatchState) {
  jest.mocked(useCatchSession).mockReturnValue({ machine, setTouching: jest.fn() });
}

beforeEach(() => {
  jest.clearAllMocks();
  now = START + MINUTE;
  mockLocation = { status: 'ready', observer: OBSERVER };
  jest.mocked(useSessionFeatures).mockReturnValue(DEVICE_FEATURES);
  jest.mocked(usePointing).mockReturnValue(pointing('sensors'));
  machineIs(AIMING);
  jest.mocked(useChosenLocation).mockReturnValue(null);
});

describe('useCatch', () => {
  describe('given the satellite is up and the user is aiming with the compass', () => {
    let result: Awaited<ReturnType<typeof renderCatch>>;

    beforeEach(async () => {
      result = await renderCatch();
    });

    test('then the user is aiming', () => {
      expect(result.phase).toBe('aiming');
    });

    test('then it says where the satellite is now', () => {
      expect(result.look).toEqual({ azimuth: 300, elevation: 10 });
    });

    test('then nothing has been caught', () => {
      expect(result.caught).toBeNull();
    });

    test('then it draws with the pointing', () => {
      expect(result.sky).toMatchObject({ azimuth: 'az', elevation: 'el', roll: 'roll' });
    });

    test('then it hands over the camera aim and the gesture', () => {
      expect(result).toMatchObject({ aim: 'aim', gesture: 'gesture', manual: false });
    });

    test('then the camera aims from where the user is, if the session allows it', () => {
      expect(useCameraAim).toHaveBeenLastCalledWith(expect.anything(), OBSERVER, now, true);
    });
  });

  describe('given the location is still being found', () => {
    beforeEach(async () => {
      mockLocation = { status: 'locating' };
      await renderCatch();
    });

    test('then the camera has no place to aim from', () => {
      expect(useCameraAim).toHaveBeenLastCalledWith(expect.anything(), null, now, true);
    });
  });

  describe('given the satellite has been caught', () => {
    beforeEach(() => {
      machineIs({ status: 'caught', target: TARGET, caughtAt: now, angleError: 1.5 });
    });

    test('then it says when and how well', async () => {
      expect((await renderCatch()).caught).toEqual({ caughtAt: now, angleError: 1.5 });
    });
  });

  describe('given the compass needs calibrating', () => {
    test('then it asks for calibration while aiming with the compass', async () => {
      jest.mocked(usePointing).mockReturnValue(pointing('sensors', true));
      expect((await renderCatch()).calibrate).toBe(true);
    });

    test('then it does not ask while aiming by dragging', async () => {
      jest.mocked(usePointing).mockReturnValue(pointing('manual', true));
      expect(await renderCatch()).toMatchObject({ calibrate: false, manual: true });
    });
  });

  describe('given the session observes from a chosen city', () => {
    beforeEach(() => {
      jest.mocked(useChosenLocation).mockReturnValue(MADRID);
    });

    test('then it shows the city', async () => {
      expect((await renderCatch()).chosenLocation).toEqual(MADRID);
    });
  });

  describe('given the pass has not started', () => {
    beforeEach(() => {
      now = START - MINUTE;
      machineIs(IDLE);
    });

    test('then it counts down to the pass', async () => {
      expect((await renderCatch()).phase).toBe('waiting');
    });

    test('then it says where the satellite will appear', async () => {
      expect((await renderCatch()).look).toEqual({ azimuth: 300, elevation: 10 });
    });
  });
});

describe('catchPhase', () => {
  test('a pass still to come is waiting, whatever the machine says', () => {
    expect(catchPhase(AIMING, true)).toBe('waiting');
  });

  test('an idle machine during the pass means the satellite isn’t up', () => {
    expect(catchPhase(IDLE, false)).toBe('notUp');
  });

  test('otherwise it follows the machine', () => {
    expect(catchPhase({ status: 'failed', target: TARGET }, false)).toBe('failed');
  });
});

describe('startingAim', () => {
  test('it starts a little off the satellite so the user has to find it', () => {
    expect(startingAim(PASS, START + MINUTE)).toEqual({ azimuth: 325, elevation: 0 });
  });

  test('it wraps past north', () => {
    const north = {
      ...PASS,
      track: PASS.track.map((point) => ({ ...point, azimuth: 350, elevation: 50 })),
    };
    expect(startingAim(north, START)).toEqual({
      azimuth: expect.closeTo(15),
      elevation: expect.closeTo(35),
    });
  });

  test('it starts from the pass’s first point before the pass', () => {
    expect(startingAim(PASS, START - 10 * MINUTE)).toEqual({ azimuth: 325, elevation: 0 });
  });

  test('it guesses when the pass has no track', () => {
    expect(startingAim({ ...PASS, track: [] }, START)).toEqual({ azimuth: 25, elevation: 15 });
  });
});
