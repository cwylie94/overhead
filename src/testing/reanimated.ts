import { useState } from 'react';

export function useSharedValue<T>(initial: T) {
  const [value] = useState(() => {
    let current = initial;
    return {
      get: () => current,
      set: (next: T) => {
        current = next;
      },
    };
  });
  return value;
}

export function withTiming<T>(target: T): T {
  return target;
}
