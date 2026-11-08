import { visibleWindow } from '@/domain/compass';
import type { Observer } from '@/domain/observer';
import { orbitFromOmm } from '@/domain/orbit';
import { findPasses } from '@/domain/passFinder';
import { CELESTRAK_GROUPS } from '@/domain/types';

import type { Repositories } from '../repositories';
import type { NewPass } from '../schema';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const PASS_WINDOW_BEFORE = 30 * MINUTE;
export const PASS_WINDOW_AFTER = 48 * HOUR;
export const MIN_LOOKAHEAD = 24 * HOUR;
export const SATELLITES_PER_CHUNK = 12;

export const PASS_CACHE_KEY = 'passes.key';
const PASS_CACHE_VERSION = 2;
export const PASS_CACHE_VALID_UNTIL = 'passes.validUntil';

export type PassCacheInput = {
  observer: Observer;
  minElevation: number;
  now: number;
};

export type PassCacheOptions = {
  force?: boolean;
  signal?: AbortSignal;
  yieldToUi?: () => Promise<void>;
};

export type PassCacheResult =
  { status: 'fresh' } | { status: 'computed'; passes: number } | { status: 'cancelled' };

type PassCacheRepositories = Pick<Repositories, 'orbits' | 'satellites' | 'passes' | 'syncMeta'>;

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function passCacheKey(
  repositories: Pick<Repositories, 'orbits'>,
  { observer, minElevation }: Omit<PassCacheInput, 'now'>,
): string {
  const orbitStamps = CELESTRAK_GROUPS.map(
    (group) => `${group}:${repositories.orbits.latestFetchedAt(group) ?? 'none'}`,
  ).join(',');
  return `v${PASS_CACHE_VERSION}|${orbitStamps}|${observer.latitude},${observer.longitude},${observer.altitude}|${minElevation}`;
}

export function isPassCacheFresh(
  repositories: Pick<Repositories, 'orbits' | 'syncMeta'>,
  input: PassCacheInput,
): boolean {
  const validUntil = Number(repositories.syncMeta.get(PASS_CACHE_VALID_UNTIL) ?? 0);
  return (
    repositories.syncMeta.get(PASS_CACHE_KEY) === passCacheKey(repositories, input) &&
    input.now < validUntil
  );
}

export async function refreshPassCache(
  repositories: PassCacheRepositories,
  input: PassCacheInput,
  { force = false, signal, yieldToUi = nextTick }: PassCacheOptions = {},
): Promise<PassCacheResult> {
  if (!force && isPassCacheFresh(repositories, input)) {
    return { status: 'fresh' };
  }

  const key = passCacheKey(repositories, input);
  const from = input.now - PASS_WINDOW_BEFORE;
  const to = input.now + PASS_WINDOW_AFTER;
  const search = { observer: input.observer, from, to, minElevation: input.minElevation };
  const standardMagnitudes = new Map(
    repositories.satellites
      .listAll()
      .map((satellite) => [satellite.noradId, satellite.standardMagnitude]),
  );
  const orbits = repositories.orbits.listAll();
  const docked = repositories.orbits.dockingHosts();
  const rows: NewPass[] = [];

  for (let index = 0; index < orbits.length; index++) {
    if (index > 0 && index % SATELLITES_PER_CHUNK === 0) {
      await yieldToUi();
    }
    if (signal?.aborted) {
      return { status: 'cancelled' };
    }

    const { noradId, omm } = orbits[index]!;
    const standardMagnitude = standardMagnitudes.get(noradId);
    if (standardMagnitude === undefined || docked.has(noradId)) {
      continue;
    }
    for (const pass of findPasses(orbitFromOmm(omm), search, standardMagnitude)) {
      const window = visibleWindow(pass);
      if (window) {
        rows.push({
          noradId,
          startAt: window.startAt,
          peakAt: window.peakAt,
          endAt: window.endAt,
          maxElevation: window.maxElevation,
          peakMagnitude: pass.peakMagnitude,
          track: pass.track,
        });
      }
    }
  }

  if (signal?.aborted) {
    return { status: 'cancelled' };
  }
  repositories.passes.replaceAll(rows);
  repositories.syncMeta.set(PASS_CACHE_KEY, key);
  repositories.syncMeta.set(PASS_CACHE_VALID_UNTIL, String(to - MIN_LOOKAHEAD));
  return { status: 'computed', passes: rows.length };
}
