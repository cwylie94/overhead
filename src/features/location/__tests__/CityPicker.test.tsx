import { fireEvent, render, screen } from '@testing-library/react-native';

import { CityPicker, type CityPickerProps } from '../CityPicker';

const reykjavik = {
  name: 'Reykjavík',
  country: 'Iceland',
  latitude: 64.135,
  longitude: -21.895,
  population: 118_918,
};

async function renderPicker(props: Partial<CityPickerProps> = {}) {
  const merged: CityPickerProps = {
    query: '',
    results: [],
    onChangeQuery: jest.fn(),
    onSelect: jest.fn(),
    onCancel: jest.fn(),
    ...props,
  };
  await render(<CityPicker {...merged} />);
  return merged;
}

describe('CityPicker', () => {
  test('explains how to search before anything is typed', async () => {
    await renderPicker();

    expect(screen.getByText(/Type a city name/)).toBeOnTheScreen();
  });

  test('passes typing on', async () => {
    const props = await renderPicker();

    await fireEvent.changeText(screen.getByLabelText('Search cities'), 'reyk');

    expect(props.onChangeQuery).toHaveBeenCalledWith('reyk');
  });

  test('lists results and picks one', async () => {
    const props = await renderPicker({ query: 'reyk', results: [reykjavik] });

    await fireEvent.press(screen.getByRole('button', { name: 'Reykjavík, Iceland' }));

    expect(props.onSelect).toHaveBeenCalledWith(reykjavik);
  });

  test('says when nothing matches', async () => {
    await renderPicker({ query: 'atlantis ' });

    expect(screen.getByText('No cities match “atlantis”.')).toBeOnTheScreen();
  });

  test('can be cancelled', async () => {
    const props = await renderPicker();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(props.onCancel).toHaveBeenCalled();
  });
});
