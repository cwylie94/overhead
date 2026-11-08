import { render, screen } from '@testing-library/react-native';

import { TonightScreen } from '../TonightScreen';

test('shows the Tonight heading', async () => {
  await render(<TonightScreen />);

  expect(screen.getByRole('header', { name: 'Tonight' })).toBeOnTheScreen();
});
