import { fireEvent, render, screen } from '@testing-library/react-native';

import { SightingList, type SightingListItem } from '../SightingList';

const aimed: SightingListItem = {
  id: 'a',
  observedAt: Date.UTC(2026, 10, 8, 21, 12),
  angleError: 3.14,
};
const noAim: SightingListItem = {
  id: 'b',
  observedAt: Date.UTC(2026, 10, 9, 5, 30),
  angleError: null,
};

async function showSightings(sightings: SightingListItem[], onDelete: jest.Mock) {
  await render(<SightingList sightings={sightings} onDelete={onDelete} />);
}

describe('SightingList', () => {
  let sightings: SightingListItem[];
  let onDelete: jest.Mock;

  describe('given no sightings', () => {
    beforeEach(() => {
      sightings = [];
      onDelete = jest.fn();
    });

    describe('when the list shows', () => {
      beforeEach(async () => {
        await showSightings(sightings, onDelete);
      });

      test('then it shows nothing', () => {
        expect(screen.queryByText('Your sightings')).toBeNull();
      });
    });
  });

  describe('given a sighting with an aim and one without', () => {
    beforeEach(() => {
      sightings = [aimed, noAim];
      onDelete = jest.fn();
    });

    describe('when the list shows', () => {
      beforeEach(async () => {
        await showSightings(sightings, onDelete);
      });

      test('then the aimed sighting says how far off the aim was', () => {
        expect(screen.getByText('Caught, 3.1° off')).toBeOnTheScreen();
      });

      test('then the other sighting just says it was caught', () => {
        expect(screen.getByText('Caught')).toBeOnTheScreen();
      });
    });
  });

  describe('given the list is showing a sighting with an aim and one without', () => {
    beforeEach(async () => {
      sightings = [aimed, noAim];
      onDelete = jest.fn();
      await showSightings(sightings, onDelete);
    });

    describe('when the user presses delete on the second sighting', () => {
      beforeEach(async () => {
        await fireEvent.press(
          screen.getAllByRole('button', { name: /^Delete the sighting from/ })[1]!,
        );
      });

      test('then it asks to delete that sighting', () => {
        expect(onDelete).toHaveBeenCalledWith(noAim);
      });
    });
  });
});
