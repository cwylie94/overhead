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
  test('uses the language and time zone', () => {
    expect(formatPassTime(PASS_START, 'en', 'Europe/London')).toMatch(/^9:12\sPM$/);
    expect(formatPassTime(PASS_START, 'es', 'Europe/Madrid')).toBe('22:12');
  });
});

describe('formatHour', () => {
  test('shows just the hour in the local style', () => {
    expect(formatHour(PASS_START, 'en', 'Europe/London')).toMatch(/^9\sPM$/);
    expect(formatHour(PASS_START, 'es', 'Europe/Madrid')).toBe('22');
  });
});

describe('formatShortDate', () => {
  test('shows the day and a short month', () => {
    expect(formatShortDate(PASS_START, 'en')).toBe('Nov 8');
    expect(formatShortDate(PASS_START, 'es')).toBe('8 nov');
  });
});

describe('formatCountdown', () => {
  test.each([
    [PASS_START + 30_000, 'in 30 seconds'],
    [PASS_START + 12 * MINUTE, 'in 12 minutes'],
    [PASS_START + 150 * MINUTE, 'in 3 hours'],
    [PASS_START + 26 * 60 * MINUTE, 'tomorrow'],
    [PASS_START - 5 * MINUTE, '5 minutes ago'],
    [PASS_START, 'now'],
  ])('English countdown to %i', (target, expected) => {
    expect(formatCountdown(target, PASS_START, 'en')).toBe(expected);
  });

  test('Spanish countdown', () => {
    expect(formatCountdown(PASS_START + 12 * MINUTE, PASS_START, 'es')).toBe(
      'dentro de 12 minutos',
    );
  });
});

describe('formatDistance', () => {
  test('keeps kilometres for metric', () => {
    expect(formatDistance(408.5, 'metric', 'en')).toBe('409 km');
  });

  test('converts to miles for imperial instead of trusting the device region', () => {
    expect(formatDistance(408.5, 'imperial', 'en')).toBe('254 mi');
    expect(formatDistance(408.5, 'imperial', 'es')).toBe('254 mi');
  });
});
