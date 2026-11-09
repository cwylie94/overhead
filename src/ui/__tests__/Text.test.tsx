import { render, screen } from '@testing-library/react-native';

import { MAX_FONT_SCALE, Text } from '../Text';

test('caps font scaling at the size the layouts are checked at', async () => {
  await render(<Text>Tonight</Text>);

  expect(screen.getByText('Tonight')).toHaveProp('maxFontSizeMultiplier', MAX_FONT_SCALE);
});

test('lets a caller set a tighter cap', async () => {
  await render(<Text maxFontSizeMultiplier={1.4}>6 PM</Text>);

  expect(screen.getByText('6 PM')).toHaveProp('maxFontSizeMultiplier', 1.4);
});
