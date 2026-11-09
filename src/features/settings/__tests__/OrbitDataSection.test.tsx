import { render, screen } from '@testing-library/react-native';

import { OrbitDataSection, type OrbitDataSectionProps } from '../OrbitDataSection';

const NOW = Date.UTC(2026, 10, 9, 12);
const HOUR = 60 * 60 * 1_000;

describe('OrbitDataSection', () => {
  let props: OrbitDataSectionProps;

  async function showOrbitData() {
    await render(<OrbitDataSection {...props} />);
  }

  describe('given the orbit data was updated 3 hours ago and no check is running', () => {
    beforeEach(() => {
      props = { updatedAt: NOW - 3 * HOUR, status: 'idle', now: NOW };
    });

    describe('when the section shows', () => {
      beforeEach(async () => {
        await showOrbitData();
      });

      test('then it says how old the orbit data is', () => {
        expect(screen.getByText('Updated 3 hours ago')).toBeOnTheScreen();
      });

      test('then it says how often the data is checked', () => {
        expect(screen.getByText(/at most every 2 hours/)).toBeOnTheScreen();
      });

      test('then it offers no buttons', () => {
        expect(screen.queryByRole('button')).toBeNull();
      });
    });
  });

  describe('given a check is under way', () => {
    beforeEach(() => {
      props = { updatedAt: NOW, status: 'checking', now: NOW };
    });

    describe('when the section shows', () => {
      beforeEach(async () => {
        await showOrbitData();
      });

      test('then it says it is checking CelesTrak', () => {
        expect(screen.getByText('Checking CelesTrak…')).toBeOnTheScreen();
      });
    });
  });

  describe('given the last check failed', () => {
    beforeEach(() => {
      props = { updatedAt: NOW, status: 'failed', now: NOW };
    });

    describe('when the section shows', () => {
      beforeEach(async () => {
        await showOrbitData();
      });

      test('then it explains the check failed and will be tried again', () => {
        expect(
          screen.getByText("Couldn't reach CelesTrak. The app will try again later."),
        ).toBeOnTheScreen();
      });
    });
  });
});
