import { CATCH_READY_LEAD, catchWindow } from '../catchWindow';

const START = Date.UTC(2026, 10, 8, 21, 12);
const FIVE_MINUTE_PASS = { startAt: START, endAt: START + 5 * 60_000 };

describe('catchWindow', () => {
  describe('given a five-minute pass', () => {
    test.each([
      { moment: 'well before the pass', now: START - CATCH_READY_LEAD - 1, expected: 'early' },
      { moment: 'as the ready window opens', now: START - CATCH_READY_LEAD, expected: 'ready' },
      { moment: 'a minute before it appears', now: START - 60_000, expected: 'ready' },
      { moment: 'as it appears', now: START, expected: 'live' },
      { moment: 'during the pass', now: START + 60_000, expected: 'live' },
      { moment: 'as it disappears', now: FIVE_MINUTE_PASS.endAt, expected: 'over' },
    ] as const)('then it is $expected $moment', ({ now, expected }) => {
      expect(catchWindow(FIVE_MINUTE_PASS, now)).toBe(expected);
    });
  });
});

describe('CATCH_READY_LEAD', () => {
  describe('given the catch window rules', () => {
    test('then it gives ten minutes to get ready', () => {
      expect(CATCH_READY_LEAD).toBe(10 * 60_000);
    });
  });
});
