export const RARITIES = ['legendary', 'rare', 'uncommon', 'common'] as const;
export type Rarity = (typeof RARITIES)[number];

export const OBJECT_TYPES = ['payload', 'rocket_body', 'debris', 'unknown'] as const;
export type ObjectType = (typeof OBJECT_TYPES)[number];

export const CELESTRAK_GROUPS = ['visual', 'stations'] as const;
export type CelestrakGroup = (typeof CELESTRAK_GROUPS)[number];

export const UNIT_SYSTEMS = ['metric', 'imperial'] as const;
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

export type OmmRecord = {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;
  NORAD_CAT_ID: number;
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
};

export type TrackPoint = {
  time: number;
  azimuth: number;
  elevation: number;
};
