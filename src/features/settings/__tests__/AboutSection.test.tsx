import { fireEvent, render, screen } from '@testing-library/react-native';

import { AboutSection, DEMO_TAPS } from '../AboutSection';

async function tapVersion(times: number) {
  for (let tap = 0; tap < times; tap += 1) {
    await fireEvent.press(screen.getByTestId('app-version'));
  }
}

describe('AboutSection', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('shows the version and credits the city data', async () => {
    await render(<AboutSection version="1.0.0" onToggleDemo={jest.fn()} />);

    expect(screen.getByText('Version 1.0.0')).toBeOnTheScreen();
    expect(screen.getByText('City data from GeoNames (CC BY 4.0)')).toBeOnTheScreen();
  });

  test('toggles demo mode after five quick taps on the version', async () => {
    const onToggleDemo = jest.fn();
    await render(<AboutSection version="1.0.0" onToggleDemo={onToggleDemo} />);

    await tapVersion(DEMO_TAPS - 1);
    expect(onToggleDemo).not.toHaveBeenCalled();

    await tapVersion(1);
    expect(onToggleDemo).toHaveBeenCalledTimes(1);
  });

  test('starts counting again after a pause', async () => {
    const onToggleDemo = jest.fn();
    await render(<AboutSection version="1.0.0" onToggleDemo={onToggleDemo} />);

    await tapVersion(DEMO_TAPS - 1);
    jest.advanceTimersByTime(2_000);
    await tapVersion(1);

    expect(onToggleDemo).not.toHaveBeenCalled();
  });
});
