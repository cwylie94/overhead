import { fireEvent, render, screen } from '@testing-library/react-native';

import { CalibrationControls, type CalibrationControlsProps } from '../CalibrationControls';

const NOW = Date.UTC(2026, 10, 8, 21);

function makeProps(overrides: Partial<CalibrationControlsProps> = {}): CalibrationControlsProps {
  return {
    calibrating: false,
    moonUp: true,
    calibratedAt: null,
    tooFar: false,
    now: NOW,
    onStart: jest.fn(),
    onSet: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
}

async function showControls(props: CalibrationControlsProps) {
  await render(<CalibrationControls {...props} />);
}

describe('CalibrationControls', () => {
  let props: CalibrationControlsProps;

  describe('given the controls are showing while the Moon is up', () => {
    beforeEach(async () => {
      props = makeProps({ moonUp: true });
      await showControls(props);
    });

    describe('when the user presses Calibrate on the Moon', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Calibrate on the Moon' }));
      });

      test('then calibration starts', () => {
        expect(props.onStart).toHaveBeenCalled();
      });
    });
  });

  describe('given the Moon is down', () => {
    beforeEach(() => {
      props = makeProps({ moonUp: false });
    });

    describe('when the controls open', () => {
      beforeEach(async () => {
        await showControls(props);
      });

      test('then it doesn’t offer to calibrate', () => {
        expect(screen.queryByRole('button', { name: 'Calibrate on the Moon' })).toBeNull();
      });

      test('then it explains the Moon is below the horizon', () => {
        expect(screen.getByText(/below the horizon/)).toBeOnTheScreen();
      });
    });
  });

  describe('given it was calibrated 4 minutes ago', () => {
    beforeEach(() => {
      props = makeProps({ calibratedAt: NOW - 4 * 60_000 });
    });

    describe('when the controls open', () => {
      beforeEach(async () => {
        await showControls(props);
      });

      test('then it says when it was last calibrated', () => {
        expect(screen.getByText('Calibrated on the Moon 4 minutes ago')).toBeOnTheScreen();
      });
    });
  });

  describe('given the user is calibrating', () => {
    beforeEach(() => {
      props = makeProps({ calibrating: true });
    });

    describe('when the controls open', () => {
      beforeEach(async () => {
        await showControls(props);
      });

      test('then it asks the user to put the Moon in the crosshair', () => {
        expect(screen.getByText('Put the Moon in the crosshair, then tap Set.')).toBeOnTheScreen();
      });
    });
  });

  describe('given the controls are showing while the user is calibrating', () => {
    beforeEach(async () => {
      props = makeProps({ calibrating: true });
      await showControls(props);
    });

    describe('when the user presses Set', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Set' }));
      });

      test('then the calibration is set', () => {
        expect(props.onSet).toHaveBeenCalled();
      });
    });

    describe('when the user presses Cancel', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
      });

      test('then the calibration is cancelled', () => {
        expect(props.onCancel).toHaveBeenCalled();
      });
    });
  });

  describe('given the user is calibrating and the reading is too far from the Moon', () => {
    beforeEach(() => {
      props = makeProps({ calibrating: true, tooFar: true });
    });

    describe('when the controls open', () => {
      beforeEach(async () => {
        await showControls(props);
      });

      test('then it warns the reading is more than 45° from the Moon', () => {
        expect(screen.getByText(/more than 45° from the Moon/)).toBeOnTheScreen();
      });
    });
  });
});
