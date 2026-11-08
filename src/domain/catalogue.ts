import type { ObjectType, Rarity } from './types';

export type SatcatRecord = {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  NORAD_CAT_ID: number;
  OBJECT_TYPE: string;
  OWNER: string;
  LAUNCH_DATE: string | null;
};

export type CatalogueEntry = {
  noradId: number;
  name: string;
  objectType: ObjectType;
  owner: string;
  launchDate: string | null;
  rarity: Rarity;
};

export const LEGENDARY_BEFORE_YEAR = 1980;

export const CONSTELLATION_PREFIXES = [
  'COSMOS',
  'FLOCK',
  'GLOBALSTAR',
  'IRIDIUM',
  'KUIPER',
  'LEMUR',
  'ONEWEB',
  'ORBCOMM',
  'SPACEMOBILE',
  'STARLINK',
  'YAOGAN',
] as const;

const SATCAT_OBJECT_TYPES: Record<string, ObjectType> = {
  PAY: 'payload',
  'R/B': 'rocket_body',
  DEB: 'debris',
};

export function objectTypeFromSatcat(code: string): ObjectType {
  return SATCAT_OBJECT_TYPES[code] ?? 'unknown';
}

export function isConstellationMember(name: string): boolean {
  const upper = name.toUpperCase();
  return CONSTELLATION_PREFIXES.some(
    (prefix) =>
      upper === prefix || upper.startsWith(`${prefix} `) || upper.startsWith(`${prefix}-`),
  );
}

export type RarityInput = {
  name: string;
  objectType: ObjectType;
  launchDate: string | null;
  isStation: boolean;
};

export function rarityFor({ name, objectType, launchDate, isStation }: RarityInput): Rarity {
  const launchYear = launchDate ? Number(launchDate.slice(0, 4)) : Number.NaN;

  if (launchYear < LEGENDARY_BEFORE_YEAR) {
    return 'legendary';
  }
  if (objectType === 'rocket_body') {
    return 'rare';
  }
  if (objectType === 'payload' && !isStation && !isConstellationMember(name)) {
    return 'uncommon';
  }
  return 'common';
}

export function catalogueEntryFromSatcat(record: SatcatRecord, isStation: boolean): CatalogueEntry {
  const objectType = objectTypeFromSatcat(record.OBJECT_TYPE);
  const launchDate = record.LAUNCH_DATE || null;

  return {
    noradId: record.NORAD_CAT_ID,
    name: record.OBJECT_NAME,
    objectType,
    owner: record.OWNER,
    launchDate,
    rarity: rarityFor({ name: record.OBJECT_NAME, objectType, launchDate, isStation }),
  };
}

export function ommEpochToMillis(epoch: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z?$/.exec(epoch);
  if (!match) {
    throw new Error(`Unrecognised OMM epoch: ${epoch}`);
  }
  const [, year, month, day, hour, minute, second, fraction = '0'] = match;
  const milliseconds = Math.round(Number(`0.${fraction}`) * 1_000);

  return (
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ) + milliseconds
  );
}
