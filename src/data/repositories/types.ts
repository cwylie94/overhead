import type { CelestrakGroup } from '@/domain/types';

import type {
  NewOrbit,
  NewPass,
  NewSatellite,
  NewSighting,
  Orbit,
  Pass,
  Satellite,
  Sighting,
} from '../schema';

export type SatelliteRepository = {
  upsertMany(rows: NewSatellite[]): void;
  getById(noradId: number): Satellite | undefined;
  listAll(): Satellite[];
};

export type OrbitRepository = {
  replaceGroup(group: CelestrakGroup, rows: NewOrbit[]): void;
  getById(noradId: number): Orbit | undefined;
  listAll(): Orbit[];
  latestFetchedAt(group: CelestrakGroup): number | undefined;
  dockingHosts(): Map<number, number>;
  refreshDockingHosts(): void;
};

export type PassRepository = {
  replaceAll(rows: NewPass[]): void;
  getById(id: number): Pass | undefined;
  listBetween(from: number, to: number): Pass[];
  nextForSatellite(noradId: number, after: number): Pass | undefined;
};

export type SightingRepository = {
  log(sighting: NewSighting): Sighting;
  updateNote(id: string, note: string | null): void;
  delete(id: string): void;
  getById(id: string): Sighting | undefined;
  listAll(): Sighting[];
  listForSatellite(noradId: number): Sighting[];
};

export type SyncMetaRepository = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
};

export type Repositories = {
  satellites: SatelliteRepository;
  orbits: OrbitRepository;
  passes: PassRepository;
  sightings: SightingRepository;
  syncMeta: SyncMetaRepository;
};
