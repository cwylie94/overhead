import type { PassCacheState } from '@/data/passCache/runner';

import { passListProgress } from '../passListProgress';

const idle: PassCacheState = { status: 'idle', computedAt: 1, settledAt: 10, replacing: false };

describe('passListProgress', () => {
  describe('given the cache has never settled', () => {
    test('then the list is still working and not stale', () => {
      expect(passListProgress({ ...idle, settledAt: null }, 5)).toEqual({
        computing: true,
        stale: false,
      });
    });
  });

  describe('given the cache is computing for the same place', () => {
    test('then the list is working and not stale', () => {
      expect(passListProgress({ ...idle, status: 'computing', replacing: false }, 20)).toEqual({
        computing: true,
        stale: false,
      });
    });
  });

  describe('given the cache is computing for a new place', () => {
    test('then the list is working and stale', () => {
      expect(passListProgress({ ...idle, status: 'computing', replacing: true }, 20)).toEqual({
        computing: true,
        stale: true,
      });
    });
  });

  describe('given the cache has finished for a new place and the list has not reloaded since', () => {
    test('then the list keeps waiting and stays stale', () => {
      expect(passListProgress({ ...idle, replacing: true }, 9)).toEqual({
        computing: true,
        stale: true,
      });
    });
  });

  describe('given the list has loaded since the cache finished', () => {
    test('then the list is done', () => {
      expect(passListProgress({ ...idle, replacing: true }, 11)).toEqual({
        computing: false,
        stale: false,
      });
    });
  });
});
