import { render, screen } from '@testing-library/react-native';

import type { UpcomingPass } from '@/data/queries';
import { ClockProvider } from '@/environment/clock';

import { CaughtOverlay } from '../CaughtOverlay';

const NOW = Date.UTC(2026, 10, 8, 20, 0, 30);
const mockListedFrom: number[] = [];
const pass = { id: 7, noradId: 25544, rarity: 'common', maxElevation: 60 } as UpcomingPass;

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), back: jest.fn() } }));
jest.mock('@/data/AppDataContext', () => ({ useAppData: () => ({ db: {} }) }));
jest.mock('@/data/useCollection', () => ({ useCollection: () => ({ sets: [], cards: [] }) }));
jest.mock('@/data/queries', () => ({
  satelliteSightingsQuery: () => 'sightings',
  upcomingPassSummariesQuery: (_db: unknown, from: number) => {
    mockListedFrom.push(from);
    return 'summaries';
  },
}));
jest.mock('@/data/liveQuery/useLiveQuery', () => ({
  useLiveQuery: () => ({ data: [], loadedAt: 1 }),
}));
jest.mock('../catchSummary', () => ({ summarizeCatch: () => ({ next: null }) }));
jest.mock('../CaughtView', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    CaughtView: ({ now }: { now: number }) => createElement(Text, null, `caught at ${now}`),
  };
});

function overlayAt(now: number) {
  return (
    <ClockProvider clock={{ now: () => NOW }}>
      <CaughtOverlay pass={pass} caughtAt={NOW} angleError={2} now={now} />
    </ClockProvider>
  );
}

describe('CaughtOverlay', () => {
  describe('given the caught screen is showing', () => {
    beforeEach(async () => {
      mockListedFrom.length = 0;
      await render(overlayAt(NOW));
    });

    describe('when the catch clock ticks on a second', () => {
      beforeEach(async () => {
        await screen.rerender(overlayAt(NOW + 1_000));
      });

      test('then it shows the new time', () => {
        expect(screen.getByText(`caught at ${NOW + 1_000}`)).toBeOnTheScreen();
      });

      test('then it lists upcoming passes from the same minute, so the list is not reloaded', () => {
        expect(new Set(mockListedFrom)).toEqual(new Set([Date.UTC(2026, 10, 8, 20, 0)]));
      });
    });
  });
});
