import { wrapDegrees } from '../geometry';

describe('wrapDegrees', () => {
  describe('given angles inside and outside a half turn', () => {
    test.each([
      { input: 10, wrapped: 10 },
      { input: 190, wrapped: -170 },
      { input: -190, wrapped: 170 },
      { input: 360, wrapped: 0 },
      { input: 725, wrapped: 5 },
    ])('then $input° wraps to $wrapped°', ({ input, wrapped }) => {
      expect(wrapDegrees(input)).toBeCloseTo(wrapped, 9);
    });
  });
});
