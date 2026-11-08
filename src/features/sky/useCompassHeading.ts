import * as Location from 'expo-location';
import { useEffect } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { unwrapHeading } from './projection';

const SETTLE_MS = 400;

export function useCompassHeading(enabled: boolean): SharedValue<number> {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      const current = rotation.get();
      rotation.set(withTiming(Math.round(current / 360) * 360, { duration: SETTLE_MS }));
      return;
    }

    let subscription: Location.LocationSubscription | null = null;
    let active = true;
    Location.watchHeadingAsync((heading) => {
      const value = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
      rotation.set(unwrapHeading(rotation.get(), value));
    })
      .then((created) => {
        if (active) {
          subscription = created;
        } else {
          created.remove();
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [enabled, rotation]);

  return rotation;
}
