import { render, screen } from '@testing-library/react-native';

import { OrbitDataSection } from '../OrbitDataSection';

const NOW = Date.UTC(2026, 10, 9, 12);
const HOUR = 60 * 60 * 1_000;

describe('OrbitDataSection', () => {
  test('says how old the orbit data is and how often it is checked', async () => {
    await render(<OrbitDataSection updatedAt={NOW - 3 * HOUR} status="idle" now={NOW} />);

    expect(screen.getByText('Updated 3 hours ago')).toBeOnTheScreen();
    expect(screen.getByText(/at most every 2 hours/)).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('shows when a check is under way', async () => {
    await render(<OrbitDataSection updatedAt={NOW} status="checking" now={NOW} />);

    expect(screen.getByText('Checking CelesTrak…')).toBeOnTheScreen();
  });

  test('explains a failed check', async () => {
    await render(<OrbitDataSection updatedAt={NOW} status="failed" now={NOW} />);

    expect(
      screen.getByText("Couldn't reach CelesTrak. The app will try again later."),
    ).toBeOnTheScreen();
  });
});
