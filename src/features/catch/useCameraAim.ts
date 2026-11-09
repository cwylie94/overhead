import { useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { moonLookAngles } from '@/domain/moon';
import { toGeodetic, type Observer } from '@/domain/observer';
import { useClock } from '@/environment/clock';
import { useCalibrationStore } from '@/stores/calibrationStore';

import { calibrationOffset, canCalibrateOn, isPlausibleOffset } from './calibration';
import type { Pointing } from './usePointing';

export function useCameraAim(
  pointing: Pointing,
  observer: Observer | null,
  now: number,
  allowed: boolean,
) {
  const clock = useClock();
  const device = useCameraDevice('back');
  const permission = useCameraPermission();
  const [wantsCamera, setWantsCamera] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [tooFar, setTooFar] = useState(false);
  const calibratedAt = useCalibrationStore((calibration) => calibration.calibratedAt);

  const moon = useMemo(
    () => (observer ? moonLookAngles(toGeodetic(observer), now) : null),
    [observer, now],
  );

  const available = allowed && pointing.mode === 'sensors' && device !== undefined;
  const cameraOn = available && wantsCamera && permission.hasPermission;
  const denied = !permission.hasPermission && !permission.canRequestPermission;

  return {
    device,
    available,
    cameraOn,
    denied,
    moon,
    moonUp: canCalibrateOn(moon),
    calibrating: cameraOn && calibrating,
    tooFar,
    calibratedAt,
    async toggleCamera() {
      if (wantsCamera) {
        setWantsCamera(false);
        setCalibrating(false);
        return;
      }
      if (permission.hasPermission || (await permission.requestPermission())) {
        setWantsCamera(true);
      }
    },
    openSettings() {
      Linking.openSettings().catch(() => {});
    },
    startCalibration() {
      setTooFar(false);
      setCalibrating(true);
    },
    cancelCalibration() {
      setCalibrating(false);
    },
    setCalibration() {
      if (!moon) {
        return;
      }
      const offset = calibrationOffset(moon, pointing.raw.current);
      if (!isPlausibleOffset(offset)) {
        setTooFar(true);
        return;
      }
      useCalibrationStore.getState().calibrate(offset, clock.now());
      setTooFar(false);
      setCalibrating(false);
    },
  };
}
