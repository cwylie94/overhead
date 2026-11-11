import { groundDistanceKm, type Observer } from '@/domain/observer';
import type { PassSearch } from '@/domain/passFinder';
import { CELESTRAK_GROUPS } from '@/domain/types';

import type { Repositories } from '../repositories';
import type { NewPass } from '../schema';
import { passRows, type PassOrbit } from './passRows';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const PASS_WINDOW_BEFORE = 30 * MINUTE;
export const PASS_WINDOW_AFTER = 48 * HOUR;
export const MIN_LOOKAHEAD = 24 * HOUR;
export const SATELLITES_PER_CHUNK = 12;

export const PASS_CACHE_KEY = 'passes.key';
const PASS_CACHE_VERSION = 3;
export const PASS_CACHE_VALID_UNTIL = 'passes.validUntil';
export const PASS_CACHE_OBSERVER = 'passes.observer';
export const SAME_PLACE_KM = 5;

export type PassCacheInput = {
  observer: Observer;
  minElevation: number;
  now: number;
};

export type ComputePassRows = (
  orbits: PassOrbit[],
  search: PassSearch,
) => NewPass[] | Promise<NewPass[]>;

export type PassCacheOptions = {
  force?: boolean;
  signal?: AbortSignal;
  yieldToUi?: () => Promise<void>;
  computeRows?: ComputePassRows;
};

export type PassCacheResult =
  { status: 'fresh' } | { status: 'computed'; passes: number } | { status: 'cancelled' };

type PassCacheRepositories = Pick<Repositories, 'orbits' | 'satellites' | 'passes' | 'syncMeta'>;

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function passCacheKey(
  repositories: Pick<Repositories, 'orbits'>,
  { minElevation }: Pick<PassCacheInput, 'minElevation'>,
): string {
  const orbitStamps = CELESTRAK_GROUPS.map(
    (group) => `${group}:${repositories.orbits.latestFetchedAt(group) ?? 'none'}`,
  ).join(',');
  return `v${PASS_CACHE_VERSION}|${orbitStamps}|${minElevation}`;
}

function storedObserver(repositories: Pick<Repositories, 'syncMeta'>): Observer | null {
  const stored = repositories.syncMeta.get(PASS_CACHE_OBSERVER);
  return stored ? (JSON.parse(stored) as Observer) : null;
}

export function isPassCacheFor(
  repositories: Pick<Repositories, 'orbits' | 'syncMeta'>,
  input: Omit<PassCacheInput, 'now'>,
): boolean {
  const observer = storedObserver(repositories);
  return (
    repositories.syncMeta.get(PASS_CACHE_KEY) === passCacheKey(repositories, input) &&
    observer !== null &&
    groundDistanceKm(observer, input.observer) <= SAME_PLACE_KM
  );
}

export function isPassCacheFresh(
  repositories: Pick<Repositories, 'orbits' | 'syncMeta'>,
  input: PassCacheInput,
): boolean {
  const validUntil = Number(repositories.syncMeta.get(PASS_CACHE_VALID_UNTIL) ?? 0);
  return isPassCacheFor(repositories, input) && input.now < validUntil;
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    result.push(items.slice(start, start + size));
  }
  return result;
}

function orbitsToSearch(repositories: PassCacheRepositories): PassOrbit[] {
  const standardMagnitudes = new Map(
    repositories.satellites
      .listAll()
      .map((satellite) => [satellite.noradId, satellite.standardMagnitude]),
  );
  const docked = repositories.orbits.dockingHosts();
  return repositories.orbits.listAll().flatMap(({ noradId, omm }) => {
    const standardMagnitude = standardMagnitudes.get(noradId);
    return standardMagnitude === undefined || docked.has(noradId)
      ? []
      : [{ noradId, omm, standardMagnitude }];
  });
}

export async function refreshPassCache(
  repositories: PassCacheRepositories,
  input: PassCacheInput,
  { force = false, signal, yieldToUi = nextTick, computeRows = passRows }: PassCacheOptions = {},
): Promise<PassCacheResult> {
  if (!force && isPassCacheFresh(repositories, input)) {
    return { status: 'fresh' };
  }

  const key = passCacheKey(repositories, input);
  const from = input.now - PASS_WINDOW_BEFORE;
  const to = input.now + PASS_WINDOW_AFTER;
  const search: PassSearch = {
    observer: { ...input.observer },
    from,
    to,
    minElevation: input.minElevation,
  };
  const batches = chunks(orbitsToSearch(repositories), SATELLITES_PER_CHUNK);
  const rows: NewPass[] = [];

  for (const [index, batch] of batches.entries()) {
    if (index > 0) {
      await yieldToUi();
    }
    if (signal?.aborted) {
      return { status: 'cancelled' };
    }
    rows.push(...(await computeRows(batch, search)));
  }

  if (signal?.aborted) {
    return { status: 'cancelled' };
  }
  repositories.passes.replaceAll(rows);
  repositories.syncMeta.set(PASS_CACHE_KEY, key);
  repositories.syncMeta.set(PASS_CACHE_OBSERVER, JSON.stringify(input.observer));
  repositories.syncMeta.set(PASS_CACHE_VALID_UNTIL, String(to - MIN_LOOKAHEAD));
  return { status: 'computed', passes: rows.length };
}
