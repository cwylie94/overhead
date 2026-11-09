import type { Database } from '../database';
import { createOrbitRepository } from './orbitRepository';
import { createPassRepository } from './passRepository';
import { createSatelliteRepository } from './satelliteRepository';
import { createSightingRepository } from './sightingRepository';
import { createSyncMetaRepository } from './syncMetaRepository';
import type { Repositories } from './types';

export function createRepositories(db: Database): Repositories {
  return {
    satellites: createSatelliteRepository(db),
    orbits: createOrbitRepository(db),
    passes: createPassRepository(db),
    sightings: createSightingRepository(db),
    syncMeta: createSyncMetaRepository(db),
  };
}

export type * from './types';
