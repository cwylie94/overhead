import type { CollectionSet } from './collectionSets';
import type { ObjectType } from './types';

export const SILHOUETTES = [
  'station',
  'telescope',
  'earthWatcher',
  'constellation',
  'spy',
  'payload',
  'rocketStage',
  'debris',
] as const;
export type Silhouette = (typeof SILHOUETTES)[number];

const BY_SET: Readonly<Record<CollectionSet, Silhouette>> = {
  spaceStations: 'station',
  observatories: 'telescope',
  earthWatchers: 'earthWatcher',
  coldWarVeterans: 'payload',
  constellations: 'constellation',
  spentStages: 'rocketStage',
  spiesAndSecrets: 'spy',
};

export function silhouetteFor(satellite: {
  objectType: ObjectType;
  collectionSet: CollectionSet;
}): Silhouette {
  if (satellite.objectType === 'rocket_body') {
    return 'rocketStage';
  }
  if (satellite.objectType === 'debris') {
    return 'debris';
  }
  return BY_SET[satellite.collectionSet];
}
