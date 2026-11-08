import { shouldReduceMotion } from '../motionPreference';

describe('motion preference', () => {
  test.each([
    ['system', false, false],
    ['system', true, true],
    ['reduce', false, true],
    ['full', true, false],
  ] as const)('%s with the phone reducing motion: %s gives %s', (preference, system, expected) => {
    expect(shouldReduceMotion(preference, system)).toBe(expected);
  });
});
