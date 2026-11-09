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

async function renderCaught(overrides: Partial<CaughtViewProps> = {}) {
  const props: CaughtViewProps = {
    noradId: saocom.noradId,
    rarity: 'rare',
    maxElevation: 69.4,
    caughtAt: CAUGHT_AT,
    angleError: 1.84,
    now: CAUGHT_AT,
    summary: firstCatch,
    onViewCard: jest.fn(),
    onDone: jest.fn(),
    onCatchNext: jest.fn(),
    ...overrides,
  };
  await render(<CaughtView {...props} />);
  return props;
}

describe('CaughtView', () => {
  test('a first catch shows the new card, the stats and the set moving on', async () => {
    const props = await renderCaught();

    expect(screen.getByRole('header', { name: 'Caught!' })).toBeOnTheScreen();
    expect(screen.getByText('NEW')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'SAOCOM 1B, Rare, #4/16' })).toBeOnTheScreen();
    expect(screen.getByText('1.8°')).toBeOnTheScreen();
    expect(screen.getByText('69°')).toBeOnTheScreen();
    expect(screen.getByText('3 → 4 of 16')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(props.onDone).toHaveBeenCalledTimes(1);
  });

  test('leaves only once, however fast the buttons are pressed', async () => {
    const props = await renderCaught();

    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await fireEvent.press(screen.getByRole('button', { name: 'View card' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    expect(props.onDone).toHaveBeenCalledTimes(1);
    expect(props.onViewCard).not.toHaveBeenCalled();
  });

  test('a repeat catch counts the catches and celebrates a personal best', async () => {
    await renderCaught({
      summary: {
        ...firstCatch,
        headline: 'again',
        isNew: false,
        count: 3,
        personalBest: { now: 0.9, was: 2.4 },
        set: { ...firstCatch.set!, before: 4, after: 4 },
      },
    });

    expect(screen.getByRole('header', { name: 'Caught again' })).toBeOnTheScreen();
    expect(screen.queryByText('NEW')).toBeNull();
    expect(screen.getByText('Caught 3 times')).toBeOnTheScreen();
    expect(screen.getByText('Your best aim yet: 0.9°, was 2.4°')).toBeOnTheScreen();
    expect(screen.getByText('4 of 16 caught')).toBeOnTheScreen();
  });

  test('completing a set says so', async () => {
    await renderCaught({
      summary: {
        ...firstCatch,
        headline: 'setComplete',
        set: { id: 'spaceStations', before: 1, after: 2, total: 2, number: 2, cards: [saocom] },
      },
    });

    expect(screen.getByRole('header', { name: 'Set complete!' })).toBeOnTheScreen();
    expect(screen.getByText('2 of 2 caught')).toBeOnTheScreen();
    expect(screen.queryByText('off target')).toBeNull();
  });

  test('offers the next pass when one starts soon', async () => {
    const next: NextPass = {
      id: 9,
      noradId: 22285,
      name: 'SL-16 R/B',
      rarity: 'uncommon',
      startAt: CAUGHT_AT + 2 * MINUTE,
      endAt: CAUGHT_AT + 8 * MINUTE,
      maxElevation: 37,
      peakMagnitude: 2,
    };
    const props = await renderCaught({ summary: { ...firstCatch, next } });

    expect(screen.getByText(/^Up next, in 2 minutes/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Catch SL-16 R/B' }));
    expect(props.onCatchNext).toHaveBeenCalledWith(next);
    expect(screen.getByRole('button', { name: 'View card' })).toBeOnTheScreen();
  });
});
