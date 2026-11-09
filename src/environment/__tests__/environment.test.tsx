import { act, render, screen } from '@testing-library/react-native';

import { Text } from '@/ui/Text';

import { ClockProvider, useNow, type Clock } from '../clock';
import { isEstimated, locationState, observerFromCoordinates } from '../location';

const london = { latitude: 51.51, longitude: -0.13, altitude: 0 };
const guess = { latitude: 40.42, longitude: -3.7, altitude: 0 };

describe('locationState', () => {
  test('uses the cached location even before permission is known', () => {
    expect(locationState(london, { status: 'unknown' }, guess)).toEqual({
      status: 'ready',
      observer: london,
    });
  });

  test('keeps using the cached location if permission is later denied', () => {
    expect(locationState(london, { status: 'denied', canAskAgain: false }, guess).status).toBe(
      'ready',
    );
  });

  test('is denied with no cached location', () => {
    expect(locationState(null, { status: 'denied', canAskAgain: true }, guess)).toEqual({
      status: 'denied',
      canAskAgain: true,
    });
  });

  test('uses the estimate while waiting for a first fix', () => {
    const state = locationState(null, { status: 'granted' }, guess);

    expect(state).toEqual({ status: 'ready', observer: guess, estimated: true });
    expect(isEstimated(state)).toBe(true);
  });

  test('is locating until permission is known', () => {
    expect(locationState(null, { status: 'unknown' }, guess)).toEqual({ status: 'locating' });
  });

  test('a real fix is not an estimate', () => {
    expect(isEstimated(locationState(london, { status: 'granted' }, guess))).toBe(false);
  });
});

describe('observerFromCoordinates', () => {
  test('converts altitude from metres to kilometres and treats a missing one as sea level', () => {
    const coords = {
      latitude: 51.5,
      longitude: -0.1,
      altitude: 250,
      accuracy: 5,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    };

    expect(observerFromCoordinates(coords)).toEqual({
      latitude: 51.5,
      longitude: -0.1,
      altitude: 0.25,
    });
    expect(observerFromCoordinates({ ...coords, altitude: null }).altitude).toBe(0);
  });
});

describe('useNow', () => {
  function Now() {
    return <Text>{useNow(1_000)}</Text>;
  }

  test('reads the injected clock and ticks every interval', async () => {
    jest.useFakeTimers();
    let time = 10_500;
    const clock: Clock = { now: () => time };

    await render(
      <ClockProvider clock={clock}>
        <Now />
      </ClockProvider>,
    );
    expect(screen.getByText('10000')).toBeOnTheScreen();

    time = 12_200;
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    expect(screen.getByText('12000')).toBeOnTheScreen();
    jest.useRealTimers();
  });
});
