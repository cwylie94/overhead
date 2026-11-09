import { act, render, screen } from '@testing-library/react-native';

import { Text } from '@/ui/Text';

import { ClockProvider, useNow, type Clock } from '../clock';
import { isEstimated, locationState, observerFromCoordinates } from '../location';

const london = { latitude: 51.51, longitude: -0.13, altitude: 0 };
const guess = { latitude: 40.42, longitude: -3.7, altitude: 0 };

describe('locationState', () => {
  describe('given a cached location before permission is known', () => {
    test('then it uses the cached location', () => {
      expect(locationState(london, { status: 'unknown' }, guess)).toEqual({
        status: 'ready',
        observer: london,
      });
    });
  });

  describe('given a cached location and permission later denied', () => {
    test('then it keeps using the cached location', () => {
      expect(locationState(london, { status: 'denied', canAskAgain: false }, guess).status).toBe(
        'ready',
      );
    });
  });

  describe('given no cached location and permission denied', () => {
    test('then it is denied', () => {
      expect(locationState(null, { status: 'denied', canAskAgain: true }, guess)).toEqual({
        status: 'denied',
        canAskAgain: true,
      });
    });
  });

  describe('given no cached location and permission granted while waiting for a first fix', () => {
    test('then it uses the estimate', () => {
      expect(locationState(null, { status: 'granted' }, guess)).toEqual({
        status: 'ready',
        observer: guess,
        estimated: true,
      });
    });

    test('then the location is an estimate', () => {
      expect(isEstimated(locationState(null, { status: 'granted' }, guess))).toBe(true);
    });
  });

  describe('given no cached location before permission is known', () => {
    test('then it is locating', () => {
      expect(locationState(null, { status: 'unknown' }, guess)).toEqual({ status: 'locating' });
    });
  });

  describe('given a real fix and permission granted', () => {
    test('then the location is not an estimate', () => {
      expect(isEstimated(locationState(london, { status: 'granted' }, guess))).toBe(false);
    });
  });
});

describe('observerFromCoordinates', () => {
  const coords = {
    latitude: 51.5,
    longitude: -0.1,
    altitude: 250,
    accuracy: 5,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  };

  describe('given coordinates with an altitude in metres', () => {
    test('then it converts the altitude to kilometres', () => {
      expect(observerFromCoordinates(coords)).toEqual({
        latitude: 51.5,
        longitude: -0.1,
        altitude: 0.25,
      });
    });
  });

  describe('given coordinates with no altitude', () => {
    test('then it treats the altitude as sea level', () => {
      expect(observerFromCoordinates({ ...coords, altitude: null }).altitude).toBe(0);
    });
  });
});

describe('useNow', () => {
  let time: number;
  const clock: Clock = { now: () => time };

  function Now() {
    return <Text>{useNow(1_000)}</Text>;
  }

  async function showNow() {
    await render(
      <ClockProvider clock={clock}>
        <Now />
      </ClockProvider>,
    );
  }

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('given an injected clock at 10.5 s', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      time = 10_500;
    });

    describe('when the screen opens', () => {
      beforeEach(async () => {
        await showNow();
      });

      test('then it reads the injected clock to the interval', () => {
        expect(screen.getByText('10000')).toBeOnTheScreen();
      });
    });
  });

  describe('given the screen opened at 10.5 s and the clock has moved on to 12.2 s', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      time = 10_500;
      await showNow();
      time = 12_200;
    });

    describe('when an interval passes', () => {
      beforeEach(async () => {
        await act(async () => {
          jest.advanceTimersByTime(1_000);
        });
      });

      test('then it ticks to the new time', () => {
        expect(screen.getByText('12000')).toBeOnTheScreen();
      });
    });
  });
});
