import '../polyfills';

import {
  formatCountdown,
  formatDistance,
  formatHour,
  formatPassTime,
  formatShortDate,
} from '../format';

const PASS_START = Date.UTC(2026, 10, 8, 21, 12);
const MINUTE = 60_000;

describe('formatPassTime', () => {
  describe('given a pass at 21:12 UTC', () => {
    test('then it reads 9:12 PM in English in London', () => {
      expect(formatPassTime(PASS_START, 'en', 'Europe/London')).toMatch(/^9:12\sPM$/);
    });

    test('then it reads 22:12 in Spanish in Madrid', () => {
      expect(formatPassTime(PASS_START, 'es', 'Europe/Madrid')).toBe('22:12');
    });
  });
});

describe('formatHour', () => {
  describe('given a pass at 21:12 UTC', () => {
    test('then it shows just the hour as 9 PM in English in London', () => {
      expect(formatHour(PASS_START, 'en', 'Europe/London')).toMatch(/^9\sPM$/);
    });

    test('then it shows just the hour as 22 in Spanish in Madrid', () => {
      expect(formatHour(PASS_START, 'es', 'Europe/Madrid')).toBe('22');
    });
  });
});

describe('formatShortDate', () => {
  describe('given a pass on 8 November', () => {
    test.each([
      { name: 'English', language: 'en', expected: 'Nov 8' },
      { name: 'Spanish', language: 'es', expected: '8 nov' },
    ] as const)(
      'then in $name it shows the day and a short month as $expected',
      ({ language, expected }) => {
        expect(formatShortDate(PASS_START, language)).toBe(expected);
      },
    );
  });
});

describe('formatCountdown', () => {
  describe('given English', () => {
    test.each([
      { distance: '30 seconds ahead', target: PASS_START + 30_000, expected: 'in 30 seconds' },
      { distance: '12 minutes ahead', target: PASS_START + 12 * MINUTE, expected: 'in 12 minutes' },
      { distance: '150 minutes ahead', target: PASS_START + 150 * MINUTE, expected: 'in 3 hours' },
      { distance: '26 hours ahead', target: PASS_START + 26 * 60 * MINUTE, expected: 'tomorrow' },
      { distance: '5 minutes ago', target: PASS_START - 5 * MINUTE, expected: '5 minutes ago' },
      { distance: 'right now', target: PASS_START, expected: 'now' },
    ])('then a time $distance reads "$expected"', ({ target, expected }) => {
      expect(formatCountdown(target, PASS_START, 'en')).toBe(expected);
    });
  });

  describe('given Spanish', () => {
    test('then a time 12 minutes ahead reads "dentro de 12 minutos"', () => {
      expect(formatCountdown(PASS_START + 12 * MINUTE, PASS_START, 'es')).toBe(
        'dentro de 12 minutos',
      );
    });
  });
});

describe('formatDistance', () => {
  describe('given metric units', () => {
    test('then it keeps kilometres', () => {
      expect(formatDistance(408.5, 'metric', 'en')).toBe('409 km');
    });
  });

  describe('given imperial units', () => {
    test.each([
      { name: 'English', language: 'en' },
      { name: 'Spanish', language: 'es' },
    ] as const)(
      'then in $name it converts to miles instead of trusting the device region',
      ({ language }) => {
        expect(formatDistance(408.5, 'imperial', language)).toBe('254 mi');
      },
    );
  });
});
