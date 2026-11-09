import { fireEvent, render, screen } from '@testing-library/react-native';

import { SightingList, type SightingListItem } from '../SightingList';

const caught: SightingListItem = {
  id: 'a',
  observedAt: Date.UTC(2026, 10, 8, 21, 12),
  verified: true,
  angleError: 3.14,
};
const seen: SightingListItem = {
  id: 'b',
  observedAt: Date.UTC(2026, 10, 9, 5, 30),
  verified: false,
  angleError: null,
};

describe('SightingList', () => {
  test('shows nothing when there are no sightings', async () => {
    await render(<SightingList sightings={[]} onDelete={jest.fn()} />);

    expect(screen.queryByText('Your sightings')).toBeNull();
  });

  test('lists each sighting with how good the aim was', async () => {
    await render(<SightingList sightings={[caught, seen]} onDelete={jest.fn()} />);

    expect(screen.getByText('Caught, 3.1° off')).toBeOnTheScreen();
    expect(screen.getByText('Seen')).toBeOnTheScreen();
  });

  test('asks to delete the sighting that was tapped', async () => {
    const onDelete = jest.fn();
    await render(<SightingList sightings={[caught, seen]} onDelete={onDelete} />);

    await fireEvent.press(screen.getAllByRole('button', { name: /^Delete the sighting from/ })[1]!);

    expect(onDelete).toHaveBeenCalledWith(seen);
  });
});
