import { fireEvent, render, screen } from '@testing-library/react-native';

import { CityPicker, type CityPickerProps } from '../CityPicker';

const reykjavik = {
  name: 'Reykjavík',
  country: 'Iceland',
  latitude: 64.135,
  longitude: -21.895,
  population: 118_918,
};

function makeProps(overrides: Partial<CityPickerProps> = {}): CityPickerProps {
  return {
    query: '',
    results: [],
    onChangeQuery: jest.fn(),
    onSelect: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
}

async function openThePicker(props: CityPickerProps) {
  await render(<CityPicker {...props} />);
}

describe('CityPicker', () => {
  let props: CityPickerProps;

  describe('given nothing is typed', () => {
    beforeEach(() => {
      props = makeProps({ query: '', results: [] });
    });

    describe('when the picker opens', () => {
      beforeEach(async () => {
        await openThePicker(props);
      });

      test('then it explains how to search', () => {
        expect(screen.getByText(/Type a city name/)).toBeOnTheScreen();
      });
    });
  });

  describe('given the picker is open with nothing typed', () => {
    beforeEach(async () => {
      props = makeProps({ query: '', results: [] });
      await openThePicker(props);
    });

    describe('when the user types reyk', () => {
      beforeEach(async () => {
        await fireEvent.changeText(screen.getByLabelText('Search cities'), 'reyk');
      });

      test('then it passes the typing on', () => {
        expect(props.onChangeQuery).toHaveBeenCalledWith('reyk');
      });
    });

    describe('when the user presses Cancel', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
      });

      test('then the picker is cancelled', () => {
        expect(props.onCancel).toHaveBeenCalled();
      });
    });
  });

  describe('given the picker is open with Reykjavík found for reyk', () => {
    beforeEach(async () => {
      props = makeProps({ query: 'reyk', results: [reykjavik] });
      await openThePicker(props);
    });

    describe('when the user presses Reykjavík', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Reykjavík, Iceland' }));
      });

      test('then it picks Reykjavík', () => {
        expect(props.onSelect).toHaveBeenCalledWith(reykjavik);
      });
    });
  });

  describe('given a search for atlantis that finds nothing', () => {
    beforeEach(() => {
      props = makeProps({ query: 'atlantis ', results: [] });
    });

    describe('when the picker opens', () => {
      beforeEach(async () => {
        await openThePicker(props);
      });

      test('then it says no cities match', () => {
        expect(screen.getByText('No cities match “atlantis”.')).toBeOnTheScreen();
      });
    });
  });
});
