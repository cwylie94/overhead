import { fireEvent, render, screen } from '@testing-library/react-native';

import { OrbitDataSection } from '../OrbitDataSection';

const NOW = Date.UTC(2026, 10, 9, 12);
const HOUR = 60 * 60 * 1_000;

describe('OrbitDataSection', () => {
  test('says how old the orbit data is and checks for updates on request', async () => {
    const onCheck = jest.fn();
    await render(
      <OrbitDataSection updatedAt={NOW - 3 * HOUR} status="idle" now={NOW} onCheck={onCheck} />,
    );

    expect(screen.getByText('Updated 3 hours ago')).toBeOnTheScreen();
    expect(screen.getByText(/at most every 2 hours/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Check for updates' }));

    expect(onCheck).toHaveBeenCalledTimes(1);
  });

  test('disables the button while checking', async () => {
    await render(
      <OrbitDataSection updatedAt={NOW} status="checking" now={NOW} onCheck={jest.fn()} />,
    );

    expect(screen.getByText('Checking CelesTrak…')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Check for updates' })).toBeDisabled();
  });

  test('explains a failed check', async () => {
    await render(
      <OrbitDataSection updatedAt={NOW} status="failed" now={NOW} onCheck={jest.fn()} />,
    );

    expect(
      screen.getByText("Couldn't reach CelesTrak. The app will try again later."),
    ).toBeOnTheScreen();
  });
});
