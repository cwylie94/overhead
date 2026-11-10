import { CATCH_READY_LEAD, catchWindow, nextCatchWindowChange } from '../catchWindow';

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

describe('nextCatchWindowChange', () => {
  describe('given a five-minute pass', () => {
    test.each([
      {
        moment: 'well before the pass',
        now: START - CATCH_READY_LEAD - 1,
        expected: START - CATCH_READY_LEAD,
      },
      { moment: 'as the ready window opens', now: START - CATCH_READY_LEAD, expected: START },
      { moment: 'during the pass', now: START + 60_000, expected: FIVE_MINUTE_PASS.endAt },
      { moment: 'once it has gone', now: FIVE_MINUTE_PASS.endAt, expected: null },
    ])('then $moment the window next changes at $expected', ({ now, expected }) => {
      expect(nextCatchWindowChange(FIVE_MINUTE_PASS, now)).toBe(expected);
    });

    test('then each change it names really is a change of window', () => {
      const changes = [START - CATCH_READY_LEAD, START, FIVE_MINUTE_PASS.endAt];
      for (const change of changes) {
        expect(catchWindow(FIVE_MINUTE_PASS, change)).not.toBe(
          catchWindow(FIVE_MINUTE_PASS, change - 1),
        );
        expect(nextCatchWindowChange(FIVE_MINUTE_PASS, change - 1)).toBe(change);
      }
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
