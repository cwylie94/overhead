import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { SkyPosition } from '@/domain/sky';

import { elevationFromGravity } from './pointing';

export type PointingMode = 'sensors' | 'manual';

const MOTION_INTERVAL_MS = 33;
const SENSOR_TIMEOUT_MS = 2_500;
const IOS_CALIBRATION_THRESHOLD = 25;
const ANDROID_GOOD_ACCURACY = 2;

export function needsCalibration(accuracy: number): boolean {
  return Platform.OS === 'ios'
    ? accuracy < 0 || accuracy > IOS_CALIBRATION_THRESHOLD
    : accuracy < ANDROID_GOOD_ACCURACY;
}

export type Pointing = {
  azimuth: SharedValue<number>;
  elevation: SharedValue<number>;
  latest: { current: SkyPosition };
  mode: PointingMode;
  calibrate: boolean;
  setManual(position: SkyPosition): void;
};

export function usePointing(initial: SkyPosition, forceManual = false): Pointing {
  const azimuth = useSharedValue(initial.azimuth);
  const elevation = useSharedValue(initial.elevation);
  const latest = useRef<SkyPosition>(initial);
  const [mode, setMode] = useState<PointingMode>(forceManual ? 'manual' : 'sensors');
  const [calibrate, setCalibrate] = useState(false);

  useEffect(() => {
    if (mode === 'manual') {
      return;
    }
    let active = true;
    let receivedHeading = false;
    let heading: Location.LocationSubscription | null = null;
    let motion: { remove(): void } | null = null;

    const fallback = setTimeout(() => {
      if (!receivedHeading) {
        setMode('manual');
      }
    }, SENSOR_TIMEOUT_MS);

    DeviceMotion.isAvailableAsync()
      .then((available) => {
        if (!active) {
          return;
        }
        if (!available) {
          setMode('manual');
          return;
        }
        DeviceMotion.setUpdateInterval(MOTION_INTERVAL_MS);
        motion = DeviceMotion.addListener((measurement) => {
          const value = elevationFromGravity(measurement.accelerationIncludingGravity);
          elevation.set(value);
          latest.current = { ...latest.current, elevation: value };
        });
      })
      .catch(() => setMode('manual'));

    Location.watchHeadingAsync((reading) => {
      receivedHeading = true;
      const value = reading.trueHeading >= 0 ? reading.trueHeading : reading.magHeading;
      azimuth.set(value);
      latest.current = { ...latest.current, azimuth: value };
      setCalibrate(needsCalibration(reading.accuracy));
    })
      .then((subscription) => {
        if (active) {
          heading = subscription;
        } else {
          subscription.remove();
        }
      })
      .catch(() => setMode('manual'));

    return () => {
      active = false;
      clearTimeout(fallback);
      heading?.remove();
      motion?.remove();
    };
  }, [mode, azimuth, elevation]);

  const setManual = useCallback((position: SkyPosition) => {
    latest.current = position;
  }, []);

  return { azimuth, elevation, latest, mode, calibrate, setManual };
}
