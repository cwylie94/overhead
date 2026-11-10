import { useCallback, useSyncExternalStore } from 'react';

import { catchWindow, nextCatchWindowChange, type CatchWindow } from '@/domain/catchWindow';
import { useClock } from '@/environment/clock';

export function useCatchWindow({
  startAt,
  endAt,
}: {
  startAt: number;
  endAt: number;
}): CatchWindow {
  const clock = useClock();
  const subscribe = useCallback(
    (notify: () => void) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const wait = () => {
        const now = clock.now();
        const next = nextCatchWindowChange({ startAt, endAt }, now);
        if (next !== null) {
          timer = setTimeout(() => {
            notify();
            wait();
          }, next - now);
        }
      };
      wait();
      return () => clearTimeout(timer);
    },
    [startAt, endAt, clock],
  );
  return useSyncExternalStore(subscribe, () => catchWindow({ startAt, endAt }, clock.now()));
}
