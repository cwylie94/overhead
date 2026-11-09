import type { PassCacheState } from '@/data/passCache/runner';

export type PassListProgress = { computing: boolean; stale: boolean };

export function passListProgress(cache: PassCacheState, loadedAt: number | null): PassListProgress {
  if (cache.status === 'computing') {
    return { computing: true, stale: cache.replacing };
  }
  const caughtUp = cache.settledAt !== null && loadedAt !== null && loadedAt > cache.settledAt;
  return { computing: !caughtUp, stale: !caughtUp && cache.replacing };
}
