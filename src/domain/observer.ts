'worklet';

import { ecfToLookAngles, eciToEcf, gstime, type GeodeticLocation } from 'satellite.js';

import { DEG, EARTH_RADIUS_KM, normalizeDegrees, type Vector3 } from './geometry';

export type Observer = {
  latitude: number;
  longitude: number;
  altitude: number;
};

export type LookAngles = {
  azimuth: number;
  elevation: number;
  rangeKm: number;
};

export function toGeodetic({ latitude, longitude, altitude }: Observer): GeodeticLocation {
  return { latitude: latitude * DEG, longitude: longitude * DEG, height: altitude };
}

export function lookAnglesFromEci(
  eci: Vector3,
  observer: GeodeticLocation,
  time: number,
): LookAngles {
  const angles = ecfToLookAngles(observer, eciToEcf(eci, gstime(new Date(time))));
  return {
    azimuth: normalizeDegrees(angles.azimuth / DEG),
    elevation: angles.elevation / DEG,
    rangeKm: angles.rangeSat,
  };
}

export function groundDistanceKm(a: Observer, b: Observer): number {
  const halfLatitude = ((b.latitude - a.latitude) * DEG) / 2;
  const halfLongitude = ((b.longitude - a.longitude) * DEG) / 2;
  const haversine =
    Math.sin(halfLatitude) ** 2 +
    Math.cos(a.latitude * DEG) * Math.cos(b.latitude * DEG) * Math.sin(halfLongitude) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)));
}
