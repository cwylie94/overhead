import {
  clampOffset,
  clockStyleFor,
  formatClock,
  formatOffset,
  offsetAtX,
  TIMELINE_SPAN,
} from '../timeline';

const NINE_PM = new Date(2026, 10, 8, 21, 5).getTime();
const HALF_PAST_MIDNIGHT = new Date(2026, 10, 9, 0, 30).getTime();

describe('offsetAtX', () => {
  describe('given a finger on a timeline 300 points wide', () => {
    test.each([
      { x: 0, place: 'the start', offset: 0 },
      { x: 150, place: 'the middle', offset: TIMELINE_SPAN / 2 },
      { x: 300, place: 'the end', offset: TIMELINE_SPAN },
    ])('then at $x it puts $place of the timeline under the finger', ({ x, offset }) => {
      expect(offsetAtX(x, 300)).toBe(offset);
    });
  });

  describe('given a finger past either end of a timeline 300 points wide', () => {
    test.each([
      { x: -20, place: 'the start', offset: 0 },
      { x: 320, place: 'the end', offset: TIMELINE_SPAN },
    ])('then at $x it stays at $place of the timeline', ({ x, offset }) => {
      expect(offsetAtX(x, 300)).toBe(offset);
    });
  });

  describe('given a timeline with no width', () => {
    test('then it stays at the start', () => {
      expect(offsetAtX(50, 0)).toBe(0);
    });
  });
});

describe('clampOffset', () => {
  describe('given an offset before the start', () => {
    test('then it stays within the timeline', () => {
      expect(clampOffset(-1)).toBe(0);
    });
  });
});

describe('formatClock', () => {
  describe('given 9:05 in the evening, local time', () => {
    test.each([
      { clock: '24-hour', hour12: false, expected: '21:05' },
      { clock: '12-hour', hour12: true, expected: '9:05 PM' },
    ])('then a $clock clock shows $expected', ({ hour12, expected }) => {
      expect(formatClock(NINE_PM, { hour12, am: 'AM', pm: 'PM' })).toBe(expected);
    });
  });

  describe('given half past midnight, local time', () => {
    test('then a 12-hour clock shows 12:30 AM', () => {
      expect(formatClock(HALF_PAST_MIDNIGHT, { hour12: true, am: 'AM', pm: 'PM' })).toBe(
        '12:30 AM',
      );
    });
  });
});

describe('formatOffset', () => {
  describe('given no offset', () => {
    test('then it shows nothing', () => {
      expect(formatOffset(0)).toBe('');
    });
  });

  describe('given an offset ahead of now', () => {
    test.each([
      { minutes: 5, expected: '+5m' },
      { minutes: 135, expected: '+2h 15m' },
    ])('then $minutes minutes ahead is $expected', ({ minutes, expected }) => {
      expect(formatOffset(minutes * 60_000)).toBe(expected);
    });
  });
});

describe('clockStyleFor', () => {
  describe('given English', () => {
    test('then it uses a 12-hour clock with AM and PM', () => {
      expect(clockStyleFor('en-US')).toMatchObject({ hour12: true, am: 'AM', pm: 'PM' });
    });
  });

  describe('given Spanish', () => {
    test('then it uses a 24-hour clock', () => {
      expect(clockStyleFor('es').hour12).toBe(false);
    });
  });
});
