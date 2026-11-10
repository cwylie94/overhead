import { fireEvent, render, screen } from '@testing-library/react-native';

import type { PassSummary } from '@/data/queries';
import type { CatchTonight } from '@/domain/catchTonight';
import { deriveCollection, type CollectableSatellite } from '@/domain/collection';
import type { Reminders } from '@/reminders/useReminders';

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

const ISS_CAUGHT = deriveCollection(satellites, [{ noradId: 25544, observedAt: 1 }]);
const BOTH_STATIONS_CAUGHT = deriveCollection(satellites, [
  { noradId: 25544, observedAt: 1 },
  { noradId: 48274, observedAt: 2 },
]);

const NOW = new Date(2026, 10, 8, 18).getTime();
const MINUTE = 60_000;

const hubble: PassSummary = {
  id: 7,
  noradId: 20580,
  name: 'HST',
  rarity: 'rare',
  startAt: NOW + 30 * MINUTE,
  peakAt: NOW + 32 * MINUTE,
  endAt: NOW + 35 * MINUTE,
  maxElevation: 50,
  peakMagnitude: 2,
};

const chances: CatchTonight<PassSummary> = { label: { kind: 'tonight' }, passes: [hubble] };

function makeProps(overrides: Partial<CollectionViewProps> = {}): CollectionViewProps {
  return {
    collection: ISS_CAUGHT,
    filters: { set: null, rarity: null },
    chances: null,
    reminders: null,
    now: NOW,
    onSetFilter: jest.fn(),
    onRarityFilter: jest.fn(),
    onOpen: jest.fn(),
    onChance: jest.fn(),
    ...overrides,
  };
}

async function openTheCollection(props: CollectionViewProps) {
  await render(<CollectionView {...props} />);
}

describe('CollectionView', () => {
  let props: CollectionViewProps;

  describe('given one of the four satellites is caught and nothing passes tonight', () => {
    beforeEach(() => {
      props = makeProps({
        collection: ISS_CAUGHT,
        filters: { set: null, rarity: null },
        chances: null,
      });
    });

    describe('when the collection opens', () => {
      beforeEach(async () => {
        await openTheCollection(props);
      });

      test('then it shows how many are caught overall', () => {
        expect(screen.getByLabelText('1 of 4 caught')).toBeOnTheScreen();
      });

      test('then it shows the progress of each rarity in the collection', () => {
        expect(screen.getByRole('button', { name: 'Common, 1 of 2 caught' })).toBeOnTheScreen();
        expect(screen.getByRole('button', { name: 'Legendary, 0 of 1 caught' })).toBeOnTheScreen();
      });

      test('then it leaves out rarities the collection has none of', () => {
        expect(screen.queryByRole('button', { name: /^Uncommon/ })).toBeNull();
      });

      test('then it shows the progress of each set', () => {
        expect(screen.getByRole('header', { name: 'Space stations' })).toBeOnTheScreen();
        expect(screen.getByText('1 of 2 caught · One to go')).toBeOnTheScreen();
      });

      test('then it names the caught satellite', () => {
        expect(screen.getByText('ISS (ZARYA)')).toBeOnTheScreen();
      });

      test('then it shows when the satellite was caught', () => {
        expect(screen.getByText('Caught Jan 1')).toBeOnTheScreen();
      });

      test('then it hides the names of satellites not caught yet', () => {
        expect(screen.queryByText('HST')).toBeNull();
        expect(
          screen.getByRole('button', { name: 'Not caught yet, Rare, #1/1' }),
        ).toBeOnTheScreen();
      });

      test('then it numbers each card within its set', () => {
        expect(screen.getByRole('button', { name: 'ISS (ZARYA), Common, #2/2' })).toBeOnTheScreen();
      });

      test('then it draws what kind of object each satellite is', () => {
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

      test('then it leaves out the Catch tonight strip', () => {
        expect(screen.queryByRole('header', { name: 'Catch tonight' })).toBeNull();
      });
    });
  });

  describe('given the collection is open', () => {
    beforeEach(async () => {
      props = makeProps({ collection: ISS_CAUGHT, filters: { set: null, rarity: null } });
      await openTheCollection(props);
    });

    describe('when the user presses a card not caught yet', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: /^Not caught yet, Legendary/ }));
      });

      test('then it opens that card', () => {
        expect(props.onOpen).toHaveBeenCalledWith(694);
      });
    });
  });

  describe('given both space stations are caught', () => {
    beforeEach(() => {
      props = makeProps({ collection: BOTH_STATIONS_CAUGHT });
    });

    describe('when the collection opens', () => {
      beforeEach(async () => {
        await openTheCollection(props);
      });

      test('then it marks the set as complete', () => {
        expect(screen.getByText('2 of 2 caught · Complete')).toBeOnTheScreen();
      });
    });
  });

  describe('given the collection is filtered to observatories', () => {
    beforeEach(() => {
      props = makeProps({ filters: { set: 'observatories', rarity: null } });
    });

    describe('when the collection opens', () => {
      beforeEach(async () => {
        await openTheCollection(props);
      });

      test('then it hides the other sets', () => {
        expect(screen.queryByRole('header', { name: 'Space stations' })).toBeNull();
      });

      test('then it shows the observatories', () => {
        expect(screen.getByRole('header', { name: 'Observatories' })).toBeOnTheScreen();
      });
    });
  });

  describe('given the collection is filtered to legendary satellites', () => {
    beforeEach(() => {
      props = makeProps({ filters: { set: null, rarity: 'legendary' } });
    });

    describe('when the collection opens', () => {
      beforeEach(async () => {
        await openTheCollection(props);
      });

      test('then it shows the sets with a legendary satellite', () => {
        expect(screen.getByRole('header', { name: 'Cold War veterans' })).toBeOnTheScreen();
      });

      test('then it hides the sets without one', () => {
        expect(screen.queryByRole('header', { name: 'Space stations' })).toBeNull();
      });
    });
  });

  describe('given the collection is filtered to legendary observatories', () => {
    beforeEach(() => {
      props = makeProps({ filters: { set: 'observatories', rarity: 'legendary' } });
    });

    describe('when the collection opens', () => {
      beforeEach(async () => {
        await openTheCollection(props);
      });

      test('then it says no satellites match', () => {
        expect(screen.getByText('No satellites match these filters.')).toBeOnTheScreen();
      });
    });
  });

  describe('given the collection is open filtered to space stations', () => {
    beforeEach(async () => {
      props = makeProps({ filters: { set: 'spaceStations', rarity: null } });
      await openTheCollection(props);
    });

    describe('when the user presses Observatories', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Observatories, 0 of 1 caught' }));
      });

      test('then it filters to observatories', () => {
        expect(props.onSetFilter).toHaveBeenNthCalledWith(1, 'observatories');
      });
    });
  });

  describe('given the collection is open filtered to space stations and the user pressed Observatories', () => {
    beforeEach(async () => {
      props = makeProps({ filters: { set: 'spaceStations', rarity: null } });
      await openTheCollection(props);
      await fireEvent.press(screen.getByRole('button', { name: 'Observatories, 0 of 1 caught' }));
    });

    describe('when the user presses Space stations', () => {
      beforeEach(async () => {
        await fireEvent.press(
          screen.getByRole('button', { name: 'Space stations, 1 of 2 caught' }),
        );
      });

      test('then it clears the set filter', () => {
        expect(props.onSetFilter).toHaveBeenNthCalledWith(2, null);
      });
    });
  });

  describe('given the collection is open filtered to rare satellites', () => {
    beforeEach(async () => {
      props = makeProps({ filters: { set: null, rarity: 'rare' } });
      await openTheCollection(props);
    });

    describe('when the user presses the Legendary meter', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Legendary, 0 of 1 caught' }));
      });

      test('then it filters to legendary satellites', () => {
        expect(props.onRarityFilter).toHaveBeenNthCalledWith(1, 'legendary');
      });
    });
  });

  describe('given the collection is open filtered to rare satellites and the user pressed the Legendary meter', () => {
    beforeEach(async () => {
      props = makeProps({ filters: { set: null, rarity: 'rare' } });
      await openTheCollection(props);
      await fireEvent.press(screen.getByRole('button', { name: 'Legendary, 0 of 1 caught' }));
    });

    describe('when the user presses the Rare meter', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Rare, 0 of 1 caught' }));
      });

      test('then it clears the rarity filter', () => {
        expect(props.onRarityFilter).toHaveBeenNthCalledWith(2, null);
      });
    });
  });

  describe('given an uncaught satellite passes tonight', () => {
    beforeEach(() => {
      props = makeProps({ chances, now: NOW });
    });

    describe('when the collection opens', () => {
      beforeEach(async () => {
        await openTheCollection(props);
      });

      test('then it shows the Catch tonight strip', () => {
        expect(screen.getByRole('header', { name: 'Catch tonight' })).toBeOnTheScreen();
      });

      test('then it says how many are left to catch', () => {
        expect(screen.getByText('1 to catch')).toBeOnTheScreen();
      });
    });
  });

  describe('given the collection is open with an uncaught satellite passing tonight', () => {
    beforeEach(async () => {
      props = makeProps({ chances, now: NOW });
      await openTheCollection(props);
    });

    describe('when the user presses the chance', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByTestId('chance-20580'));
      });

      test('then it opens the pass', () => {
        expect(props.onChance).toHaveBeenCalledWith(chances.passes[0]);
      });
    });
  });

  describe('given a chance starts in five minutes', () => {
    beforeEach(() => {
      props = makeProps({ chances, now: NOW + 25 * MINUTE });
    });

    describe('when the collection opens', () => {
      beforeEach(async () => {
        await openTheCollection(props);
      });

      test('then it tells the user to get ready', () => {
        expect(screen.getByText(/^Get ready · /)).toBeOnTheScreen();
      });
    });
  });

  describe('given a chance with no reminder set', () => {
    let reminders: Reminders;

    beforeEach(() => {
      reminders = { isSet: () => false, toggle: jest.fn() };
      props = makeProps({ chances, now: NOW, reminders });
    });

    describe('when the collection opens', () => {
      beforeEach(async () => {
        await openTheCollection(props);
      });

      test('then its reminder is off', () => {
        expect(screen.getByRole('switch', { name: 'Remind me' })).not.toBeChecked();
      });
    });
  });

  describe('given the collection is open with a chance that has no reminder set', () => {
    let reminders: Reminders;

    beforeEach(async () => {
      reminders = { isSet: () => false, toggle: jest.fn() };
      props = makeProps({ chances, now: NOW, reminders });
      await openTheCollection(props);
    });

    describe('when the user presses Remind me', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('switch', { name: 'Remind me' }));
      });

      test('then it toggles the reminder for that pass', () => {
        expect(reminders.toggle).toHaveBeenCalledWith(hubble);
      });
    });
  });

  describe('given a chance whose reminder is already set', () => {
    beforeEach(() => {
      props = makeProps({ chances, now: NOW, reminders: { isSet: () => true, toggle: () => {} } });
    });

    describe('when the collection opens', () => {
      beforeEach(async () => {
        await openTheCollection(props);
      });

      test('then its reminder is on', () => {
        expect(screen.getByRole('switch', { name: 'Remind me' })).toBeChecked();
      });
    });
  });

  describe('given a chance about to start and notifications on', () => {
    beforeEach(() => {
      props = makeProps({
        chances,
        now: NOW + 25 * MINUTE,
        reminders: { isSet: () => false, toggle: () => {} },
      });
    });

    describe('when the collection opens', () => {
      beforeEach(async () => {
        await openTheCollection(props);
      });

      test('then it offers no reminder', () => {
        expect(screen.queryByRole('switch')).toBeNull();
      });
    });
  });

  describe('given a chance and notifications off', () => {
    beforeEach(() => {
      props = makeProps({ chances, now: NOW, reminders: null });
    });

    describe('when the collection opens', () => {
      beforeEach(async () => {
        await openTheCollection(props);
      });

      test('then it offers no reminders', () => {
        expect(screen.queryByRole('switch')).toBeNull();
      });
    });
  });
});

describe('rows', () => {
  describe('given seven cards and rows of three', () => {
    test('then it makes two full rows and a third with the card left over', () => {
      expect(rows([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });
  });
});
