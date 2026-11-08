import { CATCH_READY_LEAD, catchWindow } from '../catchWindow';

const START = Date.UTC(2026, 10, 8, 21, 12);
const pass = { startAt: START, endAt: START + 5 * 60_000 };

describe('catchWindow', () => {
  test.each([
    ['well before the pass', START - CATCH_READY_LEAD - 1, 'early'],
    ['as the ready window opens', START - CATCH_READY_LEAD, 'ready'],
    ['a minute before it appears', START - 60_000, 'ready'],
    ['as it appears', START, 'live'],
    ['during the pass', START + 60_000, 'live'],
    ['as it disappears', pass.endAt, 'over'],
  ] as const)('is %s', (_, now, expected) => {
    expect(catchWindow(pass, now)).toBe(expected);
  });

  test('gives ten minutes to get ready', () => {
    expect(CATCH_READY_LEAD).toBe(10 * 60_000);
  });
});
