import { render, screen } from '@testing-library/react-native';

import { MAX_FONT_SCALE, Text } from '../Text';

describe('Text', () => {
  describe('given the caller sets no cap', () => {
    describe('when the text renders', () => {
      beforeEach(async () => {
        await render(<Text>Tonight</Text>);
      });

      test('then it caps font scaling at the size the layouts are checked at', () => {
        expect(screen.getByText('Tonight')).toHaveProp('maxFontSizeMultiplier', MAX_FONT_SCALE);
      });
    });
  });

  describe('given the caller sets a tighter cap', () => {
    describe('when the text renders', () => {
      beforeEach(async () => {
        await render(<Text maxFontSizeMultiplier={1.4}>6 PM</Text>);
      });

      test('then it uses the caller’s cap', () => {
        expect(screen.getByText('6 PM')).toHaveProp('maxFontSizeMultiplier', 1.4);
      });
    });
  });
});
