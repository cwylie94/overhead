import type { PassCacheState } from '@/data/passCache/runner';

import { passListProgress } from '../passListProgress';

const idle: PassCacheState = { status: 'idle', computedAt: 1, settledAt: 10, replacing: false };

describe('passListProgress', () => {
  test('is still working before the cache has settled at all', () => {
    expect(passListProgress({ ...idle, settledAt: null }, 5)).toEqual({
      computing: true,
      stale: false,
    });
  });

  test('is working while computing, and the list is stale only for a new place', () => {
    expect(passListProgress({ ...idle, status: 'computing', replacing: false }, 20)).toEqual({
      computing: true,
      stale: false,
    });
    expect(passListProgress({ ...idle, status: 'computing', replacing: true }, 20)).toEqual({
      computing: true,
      stale: true,
    });
  });

  test('keeps waiting after the cache finishes until the list has reloaded', () => {
    expect(passListProgress({ ...idle, replacing: true }, 9)).toEqual({
      computing: true,
      stale: true,
    });
  });

  test('is done once the list has loaded since the cache finished', () => {
    expect(passListProgress({ ...idle, replacing: true }, 11)).toEqual({
      computing: false,
      stale: false,
    });
  });
});
