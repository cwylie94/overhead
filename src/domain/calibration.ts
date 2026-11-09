import { wrapDegrees } from './geometry';
import type { SkyPosition } from './sky';

export const MAX_CALIBRATION_OFFSET = 45;
export const MIN_MOON_ELEVATION = 3;

export type CalibrationOffset = { azimuth: number; elevation: number };

export const NO_OFFSET: CalibrationOffset = { azimuth: 0, elevation: 0 };

export function calibrationOffset(truth: SkyPosition, measured: SkyPosition): CalibrationOffset {
  'worklet';
  return {
    azimuth: wrapDegrees(truth.azimuth - measured.azimuth),
    elevation: truth.elevation - measured.elevation,
  };
}

export function isPlausibleOffset({ azimuth, elevation }: CalibrationOffset): boolean {
  'worklet';
  return (
    Math.abs(azimuth) <= MAX_CALIBRATION_OFFSET && Math.abs(elevation) <= MAX_CALIBRATION_OFFSET
  );
}

export function applyOffset(measured: SkyPosition, offset: CalibrationOffset): SkyPosition {
  'worklet';
  return {
    azimuth: (((measured.azimuth + offset.azimuth) % 360) + 360) % 360,
    elevation: Math.max(-90, Math.min(90, measured.elevation + offset.elevation)),
  };
}

export function canCalibrateOn(moon: SkyPosition | null): boolean {
  return moon !== null && moon.elevation >= MIN_MOON_ELEVATION;
}
