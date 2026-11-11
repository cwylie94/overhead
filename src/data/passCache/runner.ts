import type { Repositories } from '../repositories';
import { nextSequence } from '../sequence';
import {
  isPassCacheFor,
  isPassCacheFresh,
  refreshPassCache,
  type PassCacheInput,
  type PassCacheOptions,
} from './passCache';

type RunnerProgress = {
  computedAt: number | null;
  settledAt: number | null;
  replacing: boolean;
};

export type PassCacheState =
  | ({ status: 'idle' } & RunnerProgress)
  | ({ status: 'computing' } & RunnerProgress)
  | ({ status: 'error'; error: Error } & RunnerProgress);

export type PassCacheRunner = {
  getState(): PassCacheState;
  subscribe(listener: () => void): () => void;
  request(input: PassCacheInput, force?: boolean): Promise<void>;
  refresh(now: number): Promise<void>;
};

type RunnerRepositories = Parameters<typeof refreshPassCache>[0] & Pick<Repositories, 'orbits'>;

export function createPassCacheRunner(
  repositories: RunnerRepositories,
  options: Pick<PassCacheOptions, 'yieldToUi' | 'computeRows'> = {},
): PassCacheRunner {
  let state: PassCacheState = {
    status: 'idle',
    computedAt: null,
    settledAt: null,
    replacing: false,
  };
  let current: AbortController | null = null;
  let latest: PassCacheInput | null = null;
  const listeners = new Set<() => void>();

  const update = (next: PassCacheState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  async function request(input: PassCacheInput, force = false): Promise<void> {
    latest = input;
    if (!force && isPassCacheFresh(repositories, input)) {
      if (state.settledAt === null) {
        update({ ...state, settledAt: nextSequence() });
      }
      return;
    }
    current?.abort();
    const controller = new AbortController();
    current = controller;
    const replacing = !isPassCacheFor(repositories, input);
    update({ ...state, status: 'computing', replacing });

    try {
      const result = await refreshPassCache(repositories, input, {
        ...options,
        force,
        signal: controller.signal,
      });
      if (result.status !== 'cancelled') {
        update({
          status: 'idle',
          computedAt: input.now,
          settledAt: nextSequence(),
          replacing,
        });
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        update({
          ...state,
          status: 'error',
          settledAt: nextSequence(),
          error: cause instanceof Error ? cause : new Error(String(cause)),
        });
      }
    }
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    request,

    async refresh(now) {
      if (latest) {
        await request({ ...latest, now }, true);
      }
    },
  };
}
