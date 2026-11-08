import type { Repositories } from '@/data/repositories';
import type { CelestrakGroup } from '@/domain/types';

import { refreshOrbits, type OrbitFetcher, type RefreshOutcome } from './celestrak';
import { syncSightings } from './engine';
import type { SyncTransport } from './transport';

export type SyncServices = {
  repositories: Pick<Repositories, 'orbits' | 'outbox' | 'sightings' | 'syncMeta'>;
  transport: SyncTransport | null;
  fetchOrbits: OrbitFetcher;
  accountId: string;
  now(): number;
};

export type SyncReport = {
  orbits: Record<CelestrakGroup, RefreshOutcome>;
  sightings: { pushed: number; pulled: number } | null;
};

export async function runSync({
  repositories,
  transport,
  fetchOrbits,
  accountId,
  now,
}: SyncServices): Promise<SyncReport> {
  const orbits = await refreshOrbits(repositories, fetchOrbits, now());
  const sightings = transport ? await syncSightings(repositories, transport, accountId) : null;
  return { orbits, sightings };
}

export function orbitsChanged(report: SyncReport): boolean {
  return Object.values(report.orbits).includes('updated');
}
