import { fireEvent, render, screen } from '@testing-library/react-native';

import { AboutSection, DEMO_TAPS } from '../AboutSection';

async function tapVersion(times: number) {
  for (let tap = 0; tap < times; tap += 1) {
    await fireEvent.press(screen.getByTestId('app-version'));
  }
}

async function showAbout(onToggleDemo: jest.Mock, onReplayIntro: jest.Mock) {
  await render(
    <AboutSection version="1.0.0" onToggleDemo={onToggleDemo} onReplayIntro={onReplayIntro} />,
  );
}

afterEach(() => {
  jest.useRealTimers();
});

describe('AboutSection', () => {
  let onToggleDemo: jest.Mock;
  let onReplayIntro: jest.Mock;

  beforeEach(() => {
    onToggleDemo = jest.fn();
    onReplayIntro = jest.fn();
  });

  describe('given version 1.0.0', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    describe('when the section shows', () => {
      beforeEach(async () => {
        await showAbout(onToggleDemo, onReplayIntro);
      });

      test('then it shows the version', () => {
        expect(screen.getByText('Version 1.0.0')).toBeOnTheScreen();
      });

      test('then it credits the city data', () => {
        expect(screen.getByText('City data from GeoNames (CC BY 4.0)')).toBeOnTheScreen();
      });
    });
  });

  describe('given the section is showing', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      await showAbout(onToggleDemo, onReplayIntro);
    });

    describe('when the user quickly taps the version one time fewer than the demo needs', () => {
      beforeEach(async () => {
        await tapVersion(DEMO_TAPS - 1);
      });

      test('then demo mode isn’t toggled yet', () => {
        expect(onToggleDemo).not.toHaveBeenCalled();
      });
    });

    describe('when the user presses Show intro again', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Show intro again' }));
      });

      test('then it shows the intro again', () => {
        expect(onReplayIntro).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given the user has quickly tapped the version one time fewer than the demo needs', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      await showAbout(onToggleDemo, onReplayIntro);
      await tapVersion(DEMO_TAPS - 1);
    });

    describe('when the user taps it once more', () => {
      beforeEach(async () => {
        await tapVersion(1);
      });

      test('then demo mode is toggled', () => {
        expect(onToggleDemo).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given the user tapped the version one time fewer than the demo needs and then paused', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      await showAbout(onToggleDemo, onReplayIntro);
      await tapVersion(DEMO_TAPS - 1);
      jest.advanceTimersByTime(2_000);
    });

    describe('when the user taps it once more', () => {
      beforeEach(async () => {
        await tapVersion(1);
      });

      test('then it starts counting again instead of toggling demo mode', () => {
        expect(onToggleDemo).not.toHaveBeenCalled();
      });
    });
  });
});
