import type { CelestrakGroup } from '@/domain/types';

import type {
  NewOrbit,
  NewPass,
  NewSatellite,
  NewSighting,
  Orbit,
  OutboxEntry,
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
};

export type PassRepository = {
  replaceAll(rows: NewPass[]): void;
  getById(id: number): Pass | undefined;
  listBetween(from: number, to: number): Pass[];
  nextForSatellite(noradId: number, after: number): Pass | undefined;
};

export type NewLoggedSighting = Omit<NewSighting, 'updatedAt' | 'syncStatus'>;

export type SightingRepository = {
  log(sighting: NewLoggedSighting, now: number): Sighting;
  updateNote(id: string, note: string | null, now: number): void;
  delete(id: string, now: number): void;
  getById(id: string): Sighting | undefined;
  listAll(): Sighting[];
  listForSatellite(noradId: number): Sighting[];
  markSynced(ids: string[]): void;
  applyRemote(rows: RemoteSighting[]): number;
};

export type RemoteSighting = {
  id: string;
  noradId: number;
  observedAt: number;
  verified: boolean;
  angleError: number | null;
  note: string | null;
  updatedAt: number;
  deletedAt?: number | null;
};

export type OutboxRepository = {
  listPending(limit: number): OutboxEntry[];
  count(): number;
  recordAttempt(ids: number[]): void;
  remove(ids: number[]): void;
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
  outbox: OutboxRepository;
  syncMeta: SyncMetaRepository;
};
