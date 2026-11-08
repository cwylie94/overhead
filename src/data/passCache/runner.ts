import type { Repositories } from '../repositories';
import {
  isPassCacheFresh,
  refreshPassCache,
  type PassCacheInput,
  type PassCacheOptions,
} from './passCache';

export type PassCacheState =
  | { status: 'idle'; computedAt: number | null }
  | { status: 'computing'; computedAt: number | null }
  | { status: 'error'; computedAt: number | null; error: Error };

export type PassCacheRunner = {
  getState(): PassCacheState;
  subscribe(listener: () => void): () => void;
  request(input: PassCacheInput, force?: boolean): Promise<void>;
};

type RunnerRepositories = Parameters<typeof refreshPassCache>[0] & Pick<Repositories, 'orbits'>;

export function createPassCacheRunner(
  repositories: RunnerRepositories,
  options: Pick<PassCacheOptions, 'yieldToUi'> = {},
): PassCacheRunner {
  let state: PassCacheState = { status: 'idle', computedAt: null };
  let current: AbortController | null = null;
  const listeners = new Set<() => void>();

  const update = (next: PassCacheState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async request(input, force = false) {
      if (!force && isPassCacheFresh(repositories, input)) {
        return;
      }
      current?.abort();
      const controller = new AbortController();
      current = controller;
      update({ status: 'computing', computedAt: state.computedAt });

      try {
        const result = await refreshPassCache(repositories, input, {
          ...options,
          force,
          signal: controller.signal,
        });
        if (result.status !== 'cancelled') {
          update({ status: 'idle', computedAt: input.now });
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          update({
            status: 'error',
            computedAt: state.computedAt,
            error: cause instanceof Error ? cause : new Error(String(cause)),
          });
        }
      }
    },
  };
}
