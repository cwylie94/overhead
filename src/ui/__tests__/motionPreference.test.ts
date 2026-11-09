import { shouldReduceMotion } from '../motionPreference';

describe('shouldReduceMotion', () => {
  describe('given the user’s motion preference and whether the phone reduces motion', () => {
    test.each([
      {
        preference: 'system',
        phone: 'not reducing',
        system: false,
        expected: false,
        outcome: 'keeps motion',
      },
      {
        preference: 'system',
        phone: 'reducing',
        system: true,
        expected: true,
        outcome: 'reduces motion',
      },
      {
        preference: 'reduce',
        phone: 'not reducing',
        system: false,
        expected: true,
        outcome: 'reduces motion',
      },
      {
        preference: 'full',
        phone: 'reducing',
        system: true,
        expected: false,
        outcome: 'keeps motion',
      },
    ] as const)(
      'then the $preference preference with the phone $phone motion $outcome',
      ({ preference, system, expected }) => {
        expect(shouldReduceMotion(preference, system)).toBe(expected);
      },
    );
  });
});
