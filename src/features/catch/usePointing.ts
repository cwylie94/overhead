import * as Location from 'expo-location';
import { DeviceMotion, Magnetometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { applyOffset, NO_OFFSET } from '@/domain/calibration';
import type { SkyPosition } from '@/domain/sky';
import { useCalibrationStore } from '@/stores/calibrationStore';

import { cameraAzimuth } from './cameraHeading';
import { rollFromGravity } from './cameraProjection';
import { elevationFromGravity, smoothVector, type Vector } from './pointing';

export type PointingMode = 'sensors' | 'manual';

const MOTION_INTERVAL_MS = 33;
const SENSOR_TIMEOUT_MS = 2_500;
const IOS_CALIBRATION_THRESHOLD = 25;
const ANDROID_GOOD_ACCURACY = 2;
const GRAVITY_SMOOTHING = 0.25;
const MAGNETIC_SMOOTHING = 0.25;

export function needsCalibration(accuracy: number): boolean {
  return Platform.OS === 'ios'
    ? accuracy < 0 || accuracy > IOS_CALIBRATION_THRESHOLD
    : accuracy < ANDROID_GOOD_ACCURACY;
}

export type Pointing = {
  azimuth: SharedValue<number>;
  elevation: SharedValue<number>;
  roll: SharedValue<number>;
  latest: { current: SkyPosition };
  raw: { current: SkyPosition };
  mode: PointingMode;
  calibrate: boolean;
  setManual(position: SkyPosition): void;
};

export function usePointing(initial: SkyPosition): Pointing {
  const azimuth = useSharedValue(initial.azimuth);
  const elevation = useSharedValue(initial.elevation);
  const roll = useSharedValue(0);
  const latest = useRef<SkyPosition>(initial);
  const raw = useRef<SkyPosition>(initial);
  const [mode, setMode] = useState<PointingMode>('sensors');
  const [calibrate, setCalibrate] = useState(false);

  useEffect(() => {
    if (mode === 'manual') {
      return;
    }
    const headingFromSensors = Platform.OS === 'android';
    let active = true;
    let receivedHeading = false;
    let heading: Location.LocationSubscription | null = null;
    let motion: { remove(): void } | null = null;
    let compass: { remove(): void } | null = null;
    let gravity: Vector | null = null;
    let magnetic: Vector | null = null;
    let declination = 0;

    const publish = () => {
      const corrected = applyOffset(
        raw.current,
        useCalibrationStore.getState().offset ?? NO_OFFSET,
      );
      azimuth.set(corrected.azimuth);
      elevation.set(corrected.elevation);
      latest.current = corrected;
    };
    const calibration = useCalibrationStore.subscribe(publish);

    const updateAzimuth = () => {
      const magneticAzimuth = gravity && magnetic ? cameraAzimuth(gravity, magnetic) : null;
      if (magneticAzimuth === null) {
        return;
      }
      receivedHeading = true;
      raw.current = { ...raw.current, azimuth: (magneticAzimuth + declination + 360) % 360 };
    };

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
          gravity = smoothVector(
            gravity,
            measurement.accelerationIncludingGravity,
            GRAVITY_SMOOTHING,
          );
          raw.current = { ...raw.current, elevation: elevationFromGravity(gravity) };
          roll.set(rollFromGravity(gravity));
          if (headingFromSensors) {
            updateAzimuth();
          }
          publish();
        });
        if (headingFromSensors) {
          Magnetometer.setUpdateInterval(MOTION_INTERVAL_MS);
          compass = Magnetometer.addListener((reading) => {
            magnetic = smoothVector(magnetic, reading, MAGNETIC_SMOOTHING);
            updateAzimuth();
            publish();
          });
        }
      })
      .catch(() => setMode('manual'));

    Location.watchHeadingAsync((reading) => {
      setCalibrate(needsCalibration(reading.accuracy));
      if (headingFromSensors) {
        if (reading.trueHeading >= 0) {
          declination = reading.trueHeading - reading.magHeading;
        }
        return;
      }
      receivedHeading = true;
      const value = reading.trueHeading >= 0 ? reading.trueHeading : reading.magHeading;
      raw.current = { ...raw.current, azimuth: value };
      publish();
    })
      .then((subscription) => {
        if (active) {
          heading = subscription;
        } else {
          subscription.remove();
        }
      })
      .catch(() => {
        if (!headingFromSensors) {
          setMode('manual');
        }
      });

    return () => {
      active = false;
      clearTimeout(fallback);
      calibration();
      heading?.remove();
      motion?.remove();
      compass?.remove();
    };
  }, [mode, azimuth, elevation, roll]);

  const setManual = useCallback((position: SkyPosition) => {
    latest.current = position;
  }, []);

  return { azimuth, elevation, roll, latest, raw, mode, calibrate, setManual };
}
