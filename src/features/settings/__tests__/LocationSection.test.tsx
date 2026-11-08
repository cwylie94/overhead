import { fireEvent, render, screen } from '@testing-library/react-native';

import { LocationSection } from '../LocationSection';

const reykjavik = { name: 'Reykjavík', country: 'Iceland', latitude: 64.135, longitude: -21.895 };

describe('LocationSection', () => {
  test('shows the current location and offers a city instead', async () => {
    const onChooseCity = jest.fn();
    await render(
      <LocationSection customLocation={null} onChooseCity={onChooseCity} onUseGps={jest.fn()} />,
    );

    expect(screen.getByText('Current location')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Use GPS' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose a city' }));

    expect(onChooseCity).toHaveBeenCalled();
  });

  test('shows just the chosen city and goes back to GPS', async () => {
    const onUseGps = jest.fn();
    await render(
      <LocationSection customLocation={reykjavik} onChooseCity={jest.fn()} onUseGps={onUseGps} />,
    );

    expect(screen.getByText('Reykjavík')).toBeOnTheScreen();
    expect(screen.queryByText(/Iceland/)).toBeNull();
    expect(screen.queryByText(/Catches still count/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Use GPS' }));

    expect(onUseGps).toHaveBeenCalled();
  });
});
