import { fireEvent, render, screen } from '@testing-library/react-native';

import { LocationSection } from '../LocationSection';

const reykjavik = { name: 'Reykjavík', country: 'Iceland', latitude: 64.135, longitude: -21.895 };

type ChosenCity = typeof reykjavik | null;

describe('LocationSection', () => {
  let customLocation: ChosenCity;
  let onChooseCity: jest.Mock;
  let onUseGps: jest.Mock;

  async function showLocationSection() {
    await render(
      <LocationSection
        customLocation={customLocation}
        onChooseCity={onChooseCity}
        onUseGps={onUseGps}
      />,
    );
  }

  beforeEach(() => {
    onChooseCity = jest.fn();
    onUseGps = jest.fn();
  });

  describe('given no city is chosen', () => {
    beforeEach(() => {
      customLocation = null;
    });

    describe('when the section shows', () => {
      beforeEach(async () => {
        await showLocationSection();
      });

      test('then it uses the current location', () => {
        expect(screen.getByText('Current location')).toBeOnTheScreen();
      });

      test('then it doesn’t offer Use GPS', () => {
        expect(screen.queryByRole('button', { name: 'Use GPS' })).toBeNull();
      });
    });
  });

  describe('given the section is showing with no city chosen', () => {
    beforeEach(async () => {
      customLocation = null;
      await showLocationSection();
    });

    describe('when the user presses Choose a city', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Choose a city' }));
      });

      test('then it opens the city picker', () => {
        expect(onChooseCity).toHaveBeenCalled();
      });
    });
  });

  describe('given Reykjavík is chosen', () => {
    beforeEach(() => {
      customLocation = reykjavik;
    });

    describe('when the section shows', () => {
      beforeEach(async () => {
        await showLocationSection();
      });

      test('then it shows the city', () => {
        expect(screen.getByText('Reykjavík')).toBeOnTheScreen();
      });

      test('then it leaves out the country', () => {
        expect(screen.queryByText(/Iceland/)).toBeNull();
      });

      test('then it leaves out the note about catches', () => {
        expect(screen.queryByText(/Catches still count/)).toBeNull();
      });
    });
  });

  describe('given the section is showing with Reykjavík chosen', () => {
    beforeEach(async () => {
      customLocation = reykjavik;
      await showLocationSection();
    });

    describe('when the user presses Use GPS', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Use GPS' }));
      });

      test('then it goes back to GPS', () => {
        expect(onUseGps).toHaveBeenCalled();
      });
    });
  });
});
