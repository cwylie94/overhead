import type { Repositories } from '@/data/repositories';
import { ommEpochToMillis } from '@/domain/catalogue';
import { CELESTRAK_GROUPS, type CelestrakGroup, type OmmRecord } from '@/domain/types';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const MIN_REFRESH_INTERVAL = 2 * HOUR;
export const FIRST_BACKOFF = 5 * MINUTE;
export const MAX_BACKOFF = 6 * HOUR;
export const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php';

export class CelestrakError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
  }
}

export type OrbitFetcher = (group: CelestrakGroup) => Promise<OmmRecord[]>;

export type RefreshOutcome = 'updated' | 'fresh' | 'backingOff' | 'failed';

type RefreshRepositories = Pick<Repositories, 'orbits' | 'syncMeta'>;

const failuresKey = (group: CelestrakGroup) => `celestrak.${group}.failures`;
const retryAtKey = (group: CelestrakGroup) => `celestrak.${group}.retryAt`;

export function backoffDelay(failures: number, status: number | null): number {
  if (status === 403) {
    return MIN_REFRESH_INTERVAL;
  }
  return Math.min(MAX_BACKOFF, FIRST_BACKOFF * 2 ** Math.max(0, failures - 1));
}

function isOmmRecord(value: unknown): value is OmmRecord {
  const record = value as Partial<OmmRecord> | null;
  return (
    typeof record?.NORAD_CAT_ID === 'number' &&
    typeof record.EPOCH === 'string' &&
    typeof record.MEAN_MOTION === 'number' &&
    record.EPHEMERIS_TYPE === 0
  );
}

export function httpOrbitFetcher(fetchImpl: typeof fetch = fetch): OrbitFetcher {
  return async (group) => {
    const response = await fetchImpl(`${CELESTRAK_URL}?GROUP=${group}&FORMAT=JSON`);
    if (!response.ok) {
      throw new CelestrakError(`CelesTrak returned HTTP ${response.status}`, response.status);
    }
    const body: unknown = await response.json();
    if (!Array.isArray(body) || body.length === 0 || !body.every(isOmmRecord)) {
      throw new CelestrakError(`CelesTrak returned no usable orbits for ${group}`);
    }
    return body;
  };
}

export async function refreshGroup(
  repositories: RefreshRepositories,
  group: CelestrakGroup,
  fetchOrbits: OrbitFetcher,
  now: number,
): Promise<RefreshOutcome> {
  const { orbits, syncMeta } = repositories;
  const lastFetch = orbits.latestFetchedAt(group) ?? 0;
  if (now - lastFetch < MIN_REFRESH_INTERVAL) {
    return 'fresh';
  }
  if (now < Number(syncMeta.get(retryAtKey(group)) ?? 0)) {
    return 'backingOff';
  }

  try {
    const records = await fetchOrbits(group);
    orbits.replaceGroup(
      group,
      records.map((omm) => ({
        noradId: omm.NORAD_CAT_ID,
        group,
        omm,
        epoch: ommEpochToMillis(omm.EPOCH),
        fetchedAt: now,
      })),
    );
    syncMeta.set(failuresKey(group), '0');
    syncMeta.set(retryAtKey(group), '0');
    return 'updated';
  } catch (cause) {
    const failures = Number(syncMeta.get(failuresKey(group)) ?? 0) + 1;
    const status = cause instanceof CelestrakError ? cause.status : null;
    syncMeta.set(failuresKey(group), String(failures));
    syncMeta.set(retryAtKey(group), String(now + backoffDelay(failures, status)));
    return 'failed';
  }
}

export async function refreshOrbits(
  repositories: RefreshRepositories,
  fetchOrbits: OrbitFetcher,
  now: number,
): Promise<Record<CelestrakGroup, RefreshOutcome>> {
  const outcomes = {} as Record<CelestrakGroup, RefreshOutcome>;
  for (const group of CELESTRAK_GROUPS) {
    outcomes[group] = await refreshGroup(repositories, group, fetchOrbits, now);
  }
  return outcomes;
}
