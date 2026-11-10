import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import type { PassSummary } from '@/data/queries';
import { deriveCollection, type CollectableSatellite } from '@/domain/collection';
import { ClockProvider } from '@/environment/clock';

import { useCollectionTab } from '../useCollectionTab';

const MINUTE = 60_000;
const MOCK_NOW = new Date(2026, 10, 8, 20, 0).getTime();

const SATELLITES: CollectableSatellite[] = [
  {
    noradId: 25544,
    name: 'ISS (ZARYA)',
    objectType: 'payload',
    rarity: 'common',
    collectionSet: 'spaceStations',
  },
  {
    noradId: 20580,
    name: 'HST',
    objectType: 'payload',
    rarity: 'rare',
    collectionSet: 'observatories',
  },
];

function pass(noradId: number, startAt: number, id: number): PassSummary {
  return {
    id,
    noradId,
    startAt,
    peakAt: startAt + 2 * MINUTE,
    endAt: startAt + 4 * MINUTE,
    maxElevation: 60,
    peakMagnitude: 1,
    name: String(noradId),
    rarity: 'common',
  };
}

const ISS_LATER = pass(25544, MOCK_NOW + 60 * MINUTE, 1);
const HUBBLE_LIVE = pass(20580, MOCK_NOW - MINUTE, 2);
const mockPasses = [HUBBLE_LIVE, ISS_LATER];
const mockCollection = deriveCollection(SATELLITES, [{ noradId: 25544, observedAt: 1 }]);

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/data/AppDataContext', () => ({ useAppData: () => ({ db: {} }) }));
jest.mock('@/data/queries', () => ({ upcomingPassSummariesQuery: () => 'passes' }));
jest.mock('@/data/liveQuery/useLiveQuery', () => ({
  useLiveQuery: () => ({ data: mockPasses, loadedAt: 1 }),
}));
jest.mock('@/data/useCollection', () => ({ useCollection: () => mockCollection }));
jest.mock('@/reminders/useReminders', () => ({ useReminders: () => null }));

type HookResult = Awaited<ReturnType<typeof renderCollectionTab>>['result'];

function wrapper({ children }: { children: ReactNode }) {
  return <ClockProvider clock={{ now: () => MOCK_NOW }}>{children}</ClockProvider>;
}

async function renderCollectionTab() {
  return renderHook(() => useCollectionTab(), { wrapper });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useCollectionTab', () => {
  let result: HookResult;

  describe('given the ISS is caught and Hubble is passing over now', () => {
    describe('when the hook renders', () => {
      beforeEach(async () => {
        ({ result } = await renderCollectionTab());
      });

      test('then the chances tonight leave out the satellite already caught', () => {
        expect(result.current.chances?.passes).toEqual([HUBBLE_LIVE]);
      });

      test('then no filter is set', () => {
        expect(result.current.filters).toEqual({ set: null, rarity: null });
      });
    });
  });

  describe('given the tab is showing', () => {
    beforeEach(async () => {
      ({ result } = await renderCollectionTab());
    });

    describe('when the user picks the observatories set', () => {
      beforeEach(async () => {
        await act(() => result.current.onSetFilter('observatories'));
      });

      test('then the set filter is applied', () => {
        expect(result.current.filters).toEqual({ set: 'observatories', rarity: null });
      });
    });

    describe('when the user opens a card', () => {
      beforeEach(() => {
        result.current.onOpen(25544);
      });

      test('then it opens that satellite', () => {
        expect(router.push).toHaveBeenCalledWith('/satellite/25544');
      });
    });

    describe('when the user picks a chance that is passing over now', () => {
      beforeEach(() => {
        result.current.onChance(HUBBLE_LIVE);
      });

      test('then it opens catch mode for that pass', () => {
        expect(router.push).toHaveBeenCalledWith('/catch/2');
      });
    });

    describe('when the user picks a chance that is more than ten minutes away', () => {
      beforeEach(() => {
        result.current.onChance(ISS_LATER);
      });

      test('then it opens the satellite card', () => {
        expect(router.push).toHaveBeenCalledWith('/satellite/25544');
      });
    });
  });
});
