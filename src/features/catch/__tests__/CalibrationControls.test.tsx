import { fireEvent, render, screen } from '@testing-library/react-native';

import { CalibrationControls, type CalibrationControlsProps } from '../CalibrationControls';

const NOW = Date.UTC(2026, 10, 8, 21);

async function renderControls(props: Partial<CalibrationControlsProps> = {}) {
  const defaults: CalibrationControlsProps = {
    calibrating: false,
    moonUp: true,
    calibratedAt: null,
    tooFar: false,
    now: NOW,
    onStart: jest.fn(),
    onSet: jest.fn(),
    onCancel: jest.fn(),
  };
  const merged = { ...defaults, ...props };
  await render(<CalibrationControls {...merged} />);
  return merged;
}

describe('CalibrationControls', () => {
  test('offers to calibrate when the Moon is up', async () => {
    const props = await renderControls();

    await fireEvent.press(screen.getByRole('button', { name: 'Calibrate on the Moon' }));

    expect(props.onStart).toHaveBeenCalled();
  });

  test('explains why it can’t calibrate when the Moon is down', async () => {
    await renderControls({ moonUp: false });

    expect(screen.queryByRole('button', { name: 'Calibrate on the Moon' })).toBeNull();
    expect(screen.getByText(/below the horizon/)).toBeOnTheScreen();
  });

  test('says when it was last calibrated', async () => {
    await renderControls({ calibratedAt: NOW - 4 * 60_000 });

    expect(screen.getByText('Calibrated on the Moon 4 minutes ago')).toBeOnTheScreen();
  });

  test('sets or cancels while calibrating', async () => {
    const props = await renderControls({ calibrating: true });

    expect(screen.getByText('Put the Moon in the crosshair, then tap Set.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Set' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(props.onSet).toHaveBeenCalled();
    expect(props.onCancel).toHaveBeenCalled();
  });

  test('warns when the reading is too far from the Moon', async () => {
    await renderControls({ calibrating: true, tooFar: true });

    expect(screen.getByText(/more than 45° from the Moon/)).toBeOnTheScreen();
  });
});
