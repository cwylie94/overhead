import { fireEvent, render, screen } from '@testing-library/react-native';

import type { UpcomingPass } from '@/data/queries';
import { deriveCollection, type CollectableSatellite } from '@/domain/collection';

import type { CatchTonight } from '../catchTonight';
import { CollectionView, type CollectionViewProps } from '../CollectionView';
import { rows } from '../filterCollection';

jest.mock('@/ui/CardFinish', () => ({ CardFinish: () => null }));

const satellites: CollectableSatellite[] = [
  {
    noradId: 25544,
    name: 'ISS (ZARYA)',
    objectType: 'payload',
    rarity: 'common',
    collectionSet: 'spaceStations',
  },
  {
    noradId: 48274,
    name: 'CSS (TIANHE)',
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
  {
    noradId: 694,
    name: 'ATLAS CENTAUR 2',
    objectType: 'rocket_body',
    rarity: 'legendary',
    collectionSet: 'coldWarVeterans',
  },
];

const collection = deriveCollection(satellites, [{ noradId: 25544, observedAt: 1 }]);

const NOW = new Date(2026, 10, 8, 18).getTime();
const MINUTE = 60_000;

const hubble: UpcomingPass = {
  id: 7,
  noradId: 20580,
  name: 'HST',
  rarity: 'rare',
  startAt: NOW + 30 * MINUTE,
  peakAt: NOW + 32 * MINUTE,
  endAt: NOW + 35 * MINUTE,
  maxElevation: 50,
  peakMagnitude: 2,
  track: [
    { time: NOW + 30 * MINUTE, azimuth: 225, elevation: 10 },
    { time: NOW + 35 * MINUTE, azimuth: 45, elevation: 10 },
  ],
};

const chances: CatchTonight<UpcomingPass> = { label: { kind: 'tonight' }, passes: [hubble] };

async function renderView(props: Partial<CollectionViewProps> = {}) {
  const defaults: CollectionViewProps = {
    collection,
    filters: { set: null, rarity: null },
    chances: null,
    reminders: null,
    now: NOW,
    onSetFilter: jest.fn(),
    onRarityFilter: jest.fn(),
    onOpen: jest.fn(),
    onChance: jest.fn(),
  };
  await render(<CollectionView {...defaults} {...props} />);
  return { ...defaults, ...props };
}

describe('CollectionView', () => {
  test('shows overall, per-rarity and per-set progress', async () => {
    await renderView();

    expect(screen.getByLabelText('1 of 4 caught')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Common, 1 of 2 caught' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Legendary, 0 of 1 caught' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Uncommon/ })).toBeNull();
    expect(screen.getByRole('header', { name: 'Space stations' })).toBeOnTheScreen();
    expect(screen.getByText('1 of 2 caught · One to go')).toBeOnTheScreen();
  });

  test('names caught satellites with their catch date and hides the rest', async () => {
    await renderView();

    expect(screen.getByText('ISS (ZARYA)')).toBeOnTheScreen();
    expect(screen.getByText('Caught Jan 1')).toBeOnTheScreen();
    expect(screen.queryByText('HST')).toBeNull();
    expect(screen.getByRole('button', { name: 'Not caught yet, Rare, #1/1' })).toBeOnTheScreen();
  });

  test('numbers each card within its set and draws what kind of object it is', async () => {
    await renderView();

    expect(screen.getByRole('button', { name: 'ISS (ZARYA), Common, #2/2' })).toBeOnTheScreen();
    expect(
      screen.getAllByTestId('silhouette-station', { includeHiddenElements: true }),
    ).toHaveLength(2);
    expect(
      screen.getByTestId('silhouette-telescope', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('silhouette-rocketStage', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  test('opens a card, caught or not', async () => {
    const { onOpen } = await renderView();

    await fireEvent.press(screen.getByRole('button', { name: /^Not caught yet, Legendary/ }));

    expect(onOpen).toHaveBeenCalledWith(694);
  });

  test('marks a finished set as complete', async () => {
    await renderView({
      collection: deriveCollection(satellites, [
        { noradId: 25544, observedAt: 1 },
        { noradId: 48274, observedAt: 2 },
      ]),
    });

    expect(screen.getByText('2 of 2 caught · Complete')).toBeOnTheScreen();
  });

  test('filters by set', async () => {
    await renderView({ filters: { set: 'observatories', rarity: null } });

    expect(screen.queryByRole('header', { name: 'Space stations' })).toBeNull();
    expect(screen.getByRole('header', { name: 'Observatories' })).toBeOnTheScreen();
  });

  test('filters by rarity across sets', async () => {
    await renderView({ filters: { set: null, rarity: 'legendary' } });

    expect(screen.getByRole('header', { name: 'Cold War veterans' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Space stations' })).toBeNull();
  });

  test('says so when nothing matches', async () => {
    await renderView({ filters: { set: 'observatories', rarity: 'legendary' } });

    expect(screen.getByText('No satellites match these filters.')).toBeOnTheScreen();
  });

  test('toggles a set filter on and off', async () => {
    const { onSetFilter } = await renderView({ filters: { set: 'spaceStations', rarity: null } });

    await fireEvent.press(screen.getByRole('button', { name: 'Observatories, 0 of 1 caught' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Space stations, 1 of 2 caught' }));

    expect(onSetFilter).toHaveBeenNthCalledWith(1, 'observatories');
    expect(onSetFilter).toHaveBeenNthCalledWith(2, null);
  });

  test('toggles a rarity filter from its meter', async () => {
    const { onRarityFilter } = await renderView({ filters: { set: null, rarity: 'rare' } });

    await fireEvent.press(screen.getByRole('button', { name: 'Legendary, 0 of 1 caught' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Rare, 0 of 1 caught' }));

    expect(onRarityFilter).toHaveBeenNthCalledWith(1, 'legendary');
    expect(onRarityFilter).toHaveBeenNthCalledWith(2, null);
  });

  test('lists uncaught satellites to catch tonight', async () => {
    const { onChance } = await renderView({ chances });

    expect(screen.getByRole('header', { name: 'Catch tonight' })).toBeOnTheScreen();
    expect(screen.getByText('1 to catch')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('chance-20580'));

    expect(onChance).toHaveBeenCalledWith(chances.passes[0]);
  });

  test('says when a chance is about to start', async () => {
    await renderView({ chances, now: NOW + 25 * MINUTE });

    expect(screen.getByText(/^Get ready · /)).toBeOnTheScreen();
  });

  test('toggles a reminder for a chance', async () => {
    const toggle = jest.fn();
    await renderView({ chances, reminders: { isSet: () => false, toggle } });

    const bell = screen.getByRole('switch', { name: 'Remind me' });
    expect(bell).not.toBeChecked();

    await fireEvent.press(bell);

    expect(toggle).toHaveBeenCalledWith(hubble);
  });

  test('shows a reminder that is already set', async () => {
    await renderView({ chances, reminders: { isSet: () => true, toggle: () => {} } });

    expect(screen.getByRole('switch', { name: 'Remind me' })).toBeChecked();
  });

  test('offers no reminder once the pass is about to start', async () => {
    await renderView({
      chances,
      now: NOW + 25 * MINUTE,
      reminders: { isSet: () => false, toggle: () => {} },
    });

    expect(screen.queryByRole('switch')).toBeNull();
  });

  test('offers no reminders when notifications are off', async () => {
    await renderView({ chances, reminders: null });

    expect(screen.queryByRole('switch')).toBeNull();
  });

  test('leaves out the strip when there is nothing to catch', async () => {
    await renderView();

    expect(screen.queryByRole('header', { name: 'Catch tonight' })).toBeNull();
  });
});

describe('rows', () => {
  test('splits cards into rows of three', () => {
    expect(rows([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });
});
