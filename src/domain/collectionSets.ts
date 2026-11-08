import type { ObjectType } from './types';

export const COLLECTION_SETS = [
  'spaceStations',
  'observatories',
  'earthWatchers',
  'coldWarVeterans',
  'constellations',
  'spentStages',
  'spiesAndSecrets',
] as const;
export type CollectionSet = (typeof COLLECTION_SETS)[number];

export const COLD_WAR_ENDS_YEAR = 1992;

export const OBSERVATORIES: Readonly<Record<number, string>> = {
  3597: 'OAO 2',
  3669: 'ISIS 1',
  4327: 'SERT 2',
  6153: 'OAO 3 (COPERNICUS)',
  16908: 'AJISAI (EGS)',
  20261: 'INTERCOSMOS 24',
  20580: 'HST',
  21819: 'INTERCOSMOS 25',
  33504: 'KORONAS-FOTON',
  41337: 'ASTRO-H (HITOMI)',
  42758: 'HXMT (HUIYAN)',
  57800: 'XRISM',
  59588: 'ACS3',
};

export const EARTH_WATCHERS: Readonly<Record<number, string>> = {
  10967: 'SEASAT 1',
  21397: 'OKEAN-3',
  21574: 'ERS-1',
  24883: 'ORBVIEW 2 (SEASTAR)',
  25860: 'OKEAN-O',
  25994: 'TERRA',
  27386: 'ENVISAT',
  27424: 'AQUA',
  27597: 'MIDORI II (ADEOS-II)',
  28931: 'ALOS (DAICHI)',
  29228: 'RESURS-DK 1',
  31598: 'COSMO-SKYMED 1',
  39766: 'ALOS-2',
  43641: 'SAOCOM 1A',
  46265: 'SAOCOM 1B',
  63772: 'BIOMASS',
};

export const COMMERCIAL_CONSTELLATION_PREFIXES = [
  'FLOCK',
  'GLOBALSTAR',
  'IRIDIUM',
  'KUIPER',
  'LEMUR',
  'ONEWEB',
  'ORBCOMM',
  'SPACEMOBILE',
  'STARLINK',
] as const;

export function startsWithAny(name: string, prefixes: readonly string[]): boolean {
  const upper = name.toUpperCase();
  return prefixes.some(
    (prefix) =>
      upper === prefix || upper.startsWith(`${prefix} `) || upper.startsWith(`${prefix}-`),
  );
}

export type CollectionSetInput = {
  noradId: number;
  name: string;
  objectType: ObjectType;
  launchDate: string | null;
  isStation: boolean;
};

export function collectionSetFor({
  noradId,
  name,
  objectType,
  launchDate,
  isStation,
}: CollectionSetInput): CollectionSet {
  const launchYear = launchDate ? Number(launchDate.slice(0, 4)) : Number.NaN;

  if (isStation) {
    return 'spaceStations';
  }
  if (noradId in OBSERVATORIES) {
    return 'observatories';
  }
  if (noradId in EARTH_WATCHERS) {
    return 'earthWatchers';
  }
  if (launchYear < COLD_WAR_ENDS_YEAR) {
    return 'coldWarVeterans';
  }
  if (objectType === 'rocket_body') {
    return 'spentStages';
  }
  if (startsWithAny(name, COMMERCIAL_CONSTELLATION_PREFIXES)) {
    return 'constellations';
  }
  return 'spiesAndSecrets';
}
