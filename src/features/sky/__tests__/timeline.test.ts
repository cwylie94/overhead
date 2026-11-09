import {
  clampOffset,
  clockStyleFor,
  formatClock,
  formatOffset,
  offsetAtX,
  TIMELINE_SPAN,
} from '../timeline';

describe('offsetAtX', () => {
  test('puts the time under the finger', () => {
    expect(offsetAtX(0, 300)).toBe(0);
    expect(offsetAtX(150, 300)).toBe(TIMELINE_SPAN / 2);
    expect(offsetAtX(300, 300)).toBe(TIMELINE_SPAN);
  });

  test('stays within the timeline', () => {
    expect(offsetAtX(-20, 300)).toBe(0);
    expect(offsetAtX(320, 300)).toBe(TIMELINE_SPAN);
    expect(offsetAtX(50, 0)).toBe(0);
    expect(clampOffset(-1)).toBe(0);
  });
});

describe('formatClock', () => {
  const time = new Date(2026, 10, 8, 21, 5).getTime();

  test('formats 24-hour and 12-hour clocks in local time', () => {
    expect(formatClock(time, { hour12: false, am: 'AM', pm: 'PM' })).toBe('21:05');
    expect(formatClock(time, { hour12: true, am: 'AM', pm: 'PM' })).toBe('9:05 PM');
    expect(
      formatClock(new Date(2026, 10, 9, 0, 30).getTime(), { hour12: true, am: 'AM', pm: 'PM' }),
    ).toBe('12:30 AM');
  });
});

describe('formatOffset', () => {
  test.each([
    [0, ''],
    [5 * 60_000, '+5m'],
    [135 * 60_000, '+2h 15m'],
  ])('%i ms is %s', (offset, expected) => {
    expect(formatOffset(offset)).toBe(expected);
  });
});

describe('clockStyleFor', () => {
  test('English uses a 12-hour clock with AM and PM', () => {
    expect(clockStyleFor('en-US')).toMatchObject({ hour12: true, am: 'AM', pm: 'PM' });
  });

  test('Spanish uses a 24-hour clock', () => {
    expect(clockStyleFor('es').hour12).toBe(false);
  });
});
