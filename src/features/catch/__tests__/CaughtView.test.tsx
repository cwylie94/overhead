import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { CollectionCard } from '@/domain/collection';

import type { CatchSummary } from '../catchSummary';
import { CaughtView, type CaughtViewProps, type NextPass } from '../CaughtView';

jest.mock('@/ui/CardFinish', () => ({ CardFinish: () => null, HOLO_COLORS: ['#fff'] }));
jest.mock('../CaughtEffects', () => ({
  CardReveal: ({ children }: { children: ReactNode }) => children,
  ProgressFill: () => null,
  Burst: () => null,
}));

const CAUGHT_AT = new Date(2026, 10, 9, 18, 21).getTime();
const MINUTE = 60_000;

const saocom: CollectionCard = {
  noradId: 46265,
  name: 'SAOCOM 1B',
  objectType: 'payload',
  rarity: 'rare',
  collectionSet: 'earthWatchers',
  caughtAt: CAUGHT_AT,
  sightingCount: 1,
};

const firstCatch: CatchSummary<NextPass> = {
  headline: 'caught',
  isNew: true,
  count: 1,
  firstCaughtAt: CAUGHT_AT,
  personalBest: null,
  set: { id: 'earthWatchers', before: 3, after: 4, total: 16, number: 4, cards: [saocom] },
  next: null,
};

const SL16: NextPass = {
  id: 9,
  noradId: 22285,
  name: 'SL-16 R/B',
  rarity: 'uncommon',
  startAt: CAUGHT_AT + 2 * MINUTE,
  endAt: CAUGHT_AT + 8 * MINUTE,
  maxElevation: 37,
  peakMagnitude: 2,
};

const repeatCatch: CatchSummary<NextPass> = {
  ...firstCatch,
  headline: 'again',
  isNew: false,
  count: 3,
  personalBest: { now: 0.9, was: 2.4 },
  set: { ...firstCatch.set!, before: 4, after: 4 },
};

const setCompleteCatch: CatchSummary<NextPass> = {
  ...firstCatch,
  headline: 'setComplete',
  set: { id: 'spaceStations', before: 1, after: 2, total: 2, number: 2, cards: [saocom] },
};

function makeProps(summary: CatchSummary<NextPass>): CaughtViewProps {
  return {
    noradId: saocom.noradId,
    rarity: 'rare',
    maxElevation: 69.4,
    caughtAt: CAUGHT_AT,
    angleError: 1.84,
    now: CAUGHT_AT,
    summary,
    onViewCard: jest.fn(),
    onDone: jest.fn(),
    onCatchNext: jest.fn(),
  };
}

async function openTheScreen(props: CaughtViewProps) {
  await render(<CaughtView {...props} />);
}

async function press(name: string) {
  await fireEvent.press(screen.getByRole('button', { name }));
}

describe('CaughtView', () => {
  let props: CaughtViewProps;

  describe('given a first catch', () => {
    beforeEach(() => {
      props = makeProps(firstCatch);
    });

    describe('when the screen opens', () => {
      beforeEach(async () => {
        await openTheScreen(props);
      });

      test('then it says Caught!', () => {
        expect(screen.getByRole('header', { name: 'Caught!' })).toBeOnTheScreen();
      });

      test('then it marks the card as new', () => {
        expect(screen.getByText('NEW')).toBeOnTheScreen();
      });

      test('then it shows the card with its rarity and number in the set', () => {
        expect(screen.getByRole('button', { name: 'SAOCOM 1B, Rare, #4/16' })).toBeOnTheScreen();
      });

      test('then it shows the aim and the peak elevation', () => {
        expect(screen.getByText('1.8°')).toBeOnTheScreen();
        expect(screen.getByText('69°')).toBeOnTheScreen();
      });

      test('then it shows the set moving on', () => {
        expect(screen.getByText('3 → 4 of 16')).toBeOnTheScreen();
      });
    });
  });

  describe('given the screen is showing a first catch', () => {
    beforeEach(async () => {
      props = makeProps(firstCatch);
      await openTheScreen(props);
    });

    describe('when the user presses Done', () => {
      beforeEach(async () => {
        await press('Done');
      });

      test('then it leaves', () => {
        expect(props.onDone).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the user presses Done, View card and Done again in quick succession', () => {
      beforeEach(async () => {
        await press('Done');
        await press('View card');
        await press('Done');
      });

      test('then it leaves only once', () => {
        expect(props.onDone).toHaveBeenCalledTimes(1);
      });

      test('then it doesn’t open the card', () => {
        expect(props.onViewCard).not.toHaveBeenCalled();
      });
    });
  });

  describe('given a repeat catch with a personal best', () => {
    beforeEach(() => {
      props = makeProps(repeatCatch);
    });

    describe('when the screen opens', () => {
      beforeEach(async () => {
        await openTheScreen(props);
      });

      test('then it says Caught again', () => {
        expect(screen.getByRole('header', { name: 'Caught again' })).toBeOnTheScreen();
      });

      test('then it doesn’t mark the card as new', () => {
        expect(screen.queryByText('NEW')).toBeNull();
      });

      test('then it counts the catches', () => {
        expect(screen.getByText('Caught 3 times')).toBeOnTheScreen();
      });

      test('then it celebrates the personal best', () => {
        expect(screen.getByText('Your best aim yet: 0.9°, was 2.4°')).toBeOnTheScreen();
      });

      test('then it shows the set unchanged', () => {
        expect(screen.getByText('4 of 16 caught')).toBeOnTheScreen();
      });
    });
  });

  describe('given a catch that completes a set', () => {
    beforeEach(() => {
      props = makeProps(setCompleteCatch);
    });

    describe('when the screen opens', () => {
      beforeEach(async () => {
        await openTheScreen(props);
      });

      test('then it says Set complete!', () => {
        expect(screen.getByRole('header', { name: 'Set complete!' })).toBeOnTheScreen();
      });

      test('then it shows the whole set caught', () => {
        expect(screen.getByText('2 of 2 caught')).toBeOnTheScreen();
      });

      test('then it doesn’t say the aim was off target', () => {
        expect(screen.queryByText('off target')).toBeNull();
      });
    });
  });

  describe('given a catch with the next pass starting in 2 minutes', () => {
    beforeEach(() => {
      props = makeProps({ ...firstCatch, next: SL16 });
    });

    describe('when the screen opens', () => {
      beforeEach(async () => {
        await openTheScreen(props);
      });

      test('then it offers the next pass', () => {
        expect(screen.getByText(/^Up next, in 2 minutes/)).toBeOnTheScreen();
      });
    });
  });

  describe('given the screen is showing a catch with the next pass starting soon', () => {
    beforeEach(async () => {
      props = makeProps({ ...firstCatch, next: SL16 });
      await openTheScreen(props);
    });

    describe('when the user presses Catch SL-16 R/B', () => {
      beforeEach(async () => {
        await press('Catch SL-16 R/B');
      });

      test('then it goes on to catch the next pass', () => {
        expect(props.onCatchNext).toHaveBeenCalledWith(SL16);
      });

      test('then View card is still on the screen', () => {
        expect(screen.getByRole('button', { name: 'View card' })).toBeOnTheScreen();
      });
    });
  });
});
