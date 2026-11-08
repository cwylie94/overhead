import { ecfToLookAngles, eciToEcf, gstime, type GeodeticLocation } from 'satellite.js';

import { DEG, normalizeDegrees, type Vector3 } from './geometry';

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
