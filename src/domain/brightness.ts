import { startsWithAny } from './collectionSets';
import { dot, length, subtract, type Vector3 } from './geometry';
import type { ObjectType } from './types';

export const RCS_CALIBRATION = 5.5;
export const STATION_RCS = 100;
export const TYPICAL_RCS: Readonly<Record<ObjectType, number>> = {
  payload: 7,
  rocket_body: 5.9,
  debris: 1,
  unknown: 1,
};

export const BRIGHTNESS_TIERS = ['brilliant', 'bright', 'faint'] as const;
export type BrightnessTier = (typeof BRIGHTNESS_TIERS)[number];
export const BRILLIANT_AT_OR_BELOW = 1;
export const BRIGHT_AT_OR_BELOW = 3;
export const NAKED_EYE_LIMIT = 4.5;

const STANDARD_RANGE_KM = 1_000;

export const STATION_MODULE_PREFIXES = ['ISS', 'CSS'] as const;

export type MagnitudeInput = {
  name: string;
  rcs: number | null;
  objectType: ObjectType;
  isStation: boolean;
};

export function isStationModule(name: string, isStation: boolean): boolean {
  return isStation && startsWithAny(name, STATION_MODULE_PREFIXES);
}

export function standardMagnitude({ name, rcs, objectType, isStation }: MagnitudeInput): number {
  const size = rcs ?? (isStationModule(name, isStation) ? STATION_RCS : TYPICAL_RCS[objectType]);
  return Math.round((RCS_CALIBRATION - 2.5 * Math.log10(size)) * 100) / 100;
}

export function phaseAngle(satellite: Vector3, observer: Vector3, sun: Vector3): number {
  const toSun = subtract(sun, satellite);
  const toObserver = subtract(observer, satellite);
  const cosine = dot(toSun, toObserver) / (length(toSun) * length(toObserver));
  return Math.acos(Math.min(1, Math.max(-1, cosine)));
}

export function apparentMagnitude(standard: number, rangeKm: number, phase: number): number {
  const reflected = Math.sin(phase) + (Math.PI - phase) * Math.cos(phase);
  return (
    standard +
    5 * Math.log10(rangeKm / STANDARD_RANGE_KM) -
    2.5 * Math.log10(Math.max(reflected, 1e-6))
  );
}

export function isNakedEye(magnitude: number): boolean {
  return magnitude <= NAKED_EYE_LIMIT;
}

export function brightnessTier(magnitude: number): BrightnessTier {
  if (magnitude <= BRILLIANT_AT_OR_BELOW) {
    return 'brilliant';
  }
  return magnitude <= BRIGHT_AT_OR_BELOW ? 'bright' : 'faint';
}
