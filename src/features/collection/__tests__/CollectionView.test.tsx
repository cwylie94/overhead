import { fireEvent, render, screen } from '@testing-library/react-native';

import { deriveCollection, type CollectableSatellite } from '@/domain/collection';

import { CollectionView, type CollectionViewProps } from '../CollectionView';
import { rows } from '../filterCollection';

const satellites: CollectableSatellite[] = [
  { noradId: 25544, name: 'ISS (ZARYA)', rarity: 'common', collectionSet: 'spaceStations' },
  { noradId: 48274, name: 'CSS (TIANHE)', rarity: 'common', collectionSet: 'spaceStations' },
  { noradId: 20580, name: 'HST', rarity: 'rare', collectionSet: 'observatories' },
  { noradId: 694, name: 'ATLAS CENTAUR 2', rarity: 'legendary', collectionSet: 'coldWarVeterans' },
];

const collection = deriveCollection(satellites, [{ noradId: 25544, observedAt: 1 }]);

async function renderView(props: Partial<CollectionViewProps> = {}) {
  const defaults: CollectionViewProps = {
    collection,
    filters: { set: null, rarity: null },
    onSetFilter: jest.fn(),
    onRarityFilter: jest.fn(),
    onOpen: jest.fn(),
  };
  await render(<CollectionView {...defaults} {...props} />);
  return { ...defaults, ...props };
}

describe('CollectionView', () => {
  test('shows overall and per-set progress', async () => {
    await renderView();

    expect(screen.getByText('1 of 4 caught')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Space stations' })).toBeOnTheScreen();
    expect(screen.getByText('1 of 2 caught')).toBeOnTheScreen();
  });

  test('names caught satellites and hides the rest as silhouettes', async () => {
    await renderView();

    expect(screen.getByText('ISS (ZARYA)')).toBeOnTheScreen();
    expect(screen.queryByText('HST')).toBeNull();
    expect(screen.getByRole('button', { name: 'Not caught yet, Rare' })).toBeOnTheScreen();
  });

  test('opens a card, caught or not', async () => {
    const { onOpen } = await renderView();

    fireEvent.press(screen.getByRole('button', { name: 'Not caught yet, Legendary' }));

    expect(onOpen).toHaveBeenCalledWith(694);
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

    fireEvent.press(screen.getByRole('button', { name: 'Observatories' }));
    fireEvent.press(screen.getByRole('button', { name: 'Space stations' }));

    expect(onSetFilter).toHaveBeenNthCalledWith(1, 'observatories');
    expect(onSetFilter).toHaveBeenNthCalledWith(2, null);
  });
});

describe('rows', () => {
  test('splits cards into rows of three', () => {
    expect(rows([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });
});
