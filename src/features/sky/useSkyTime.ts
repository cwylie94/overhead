import { useEffect } from 'react';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { ALWAYS_ANIMATE } from '@/ui/motion';

export function useSkyTime(now: number, committedOffset: number) {
  const base = useSharedValue(now);
  const offset = useSharedValue(committedOffset);
  const time = useDerivedValue(() => base.get() + offset.get());

  useEffect(() => {
    base.set(
      withTiming(now + 1_000, { duration: 1_000, easing: Easing.linear, ...ALWAYS_ANIMATE }),
    );
  }, [base, now]);

  return {
    base,
    offset,
    time,
    backToNow: () => offset.set(withTiming(0, { duration: 300 })),
  };
}
