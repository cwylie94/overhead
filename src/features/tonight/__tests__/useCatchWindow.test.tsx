import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { CATCH_READY_LEAD } from '@/domain/catchWindow';
import { ClockProvider, systemClock } from '@/environment/clock';

import { useCatchWindow } from '../useCatchWindow';

const START = Date.UTC(2026, 10, 8, 21, 12);
const PASS = { startAt: START, endAt: START + 5 * 60_000 };
const MINUTE = 60_000;

function wrapper({ children }: { children: ReactNode }) {
  return <ClockProvider clock={systemClock}>{children}</ClockProvider>;
}

async function renderWindow() {
  let renders = 0;
  const hook = await renderHook(
    () => {
      renders += 1;
      return useCatchWindow(PASS);
    },
    { wrapper },
  );
  return { result: hook.result, renders: () => renders };
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

afterEach(() => {
  jest.useRealTimers();
});

describe('useCatchWindow', () => {
  describe('given a pass that starts in 15 minutes', () => {
    let view: Awaited<ReturnType<typeof renderWindow>>;

    beforeEach(async () => {
      jest.useFakeTimers({ now: START - 15 * MINUTE });
      view = await renderWindow();
    });

    test('then it is too early to catch', () => {
      expect(view.result.current).toBe('early');
    });

    describe('when four minutes go by', () => {
      beforeEach(async () => {
        await advance(4 * MINUTE);
      });

      test('then it has not redrawn, because nothing changed', () => {
        expect(view.renders()).toBe(1);
      });
    });

    describe('when the ready window opens', () => {
      beforeEach(async () => {
        await advance(15 * MINUTE - CATCH_READY_LEAD);
      });

      test('then it is ready', () => {
        expect(view.result.current).toBe('ready');
      });
    });

    describe('when the pass starts', () => {
      beforeEach(async () => {
        await advance(15 * MINUTE);
      });

      test('then it is live', () => {
        expect(view.result.current).toBe('live');
      });
    });

    describe('when the clock runs through the ready window, the pass and past its end', () => {
      beforeEach(async () => {
        await advance(15 * MINUTE - CATCH_READY_LEAD);
        await advance(CATCH_READY_LEAD);
        await advance(5 * MINUTE);
      });

      test('then it is over', () => {
        expect(view.result.current).toBe('over');
      });

      test('then it redrew once for each change of window', () => {
        expect(view.renders()).toBe(4);
      });
    });
  });
});
