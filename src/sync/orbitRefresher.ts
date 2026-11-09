import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import type { Clock } from '@/environment/clock';

import {
  anyFailed,
  orbitsChanged,
  refreshOrbits,
  type OrbitFetcher,
  type RefreshRepositories,
} from './celestrak';

export type RefreshStatus = 'idle' | 'checking' | 'failed';

export type OrbitRefresher = {
  getStatus(): RefreshStatus;
  subscribe(listener: () => void): () => void;
  refresh(): Promise<void>;
  start(): () => void;
};

type OrbitRefresherOptions = {
  repositories: RefreshRepositories;
  fetchOrbits: OrbitFetcher;
  clock: Clock;
  onOrbitsChanged(): Promise<void>;
};

export function createOrbitRefresher({
  repositories,
  fetchOrbits,
  clock,
  onOrbitsChanged,
}: OrbitRefresherOptions): OrbitRefresher {
  let status: RefreshStatus = 'idle';
  let inFlight: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const setStatus = (next: RefreshStatus) => {
    if (next !== status) {
      status = next;
      listeners.forEach((listener) => listener());
    }
  };

  async function check(): Promise<void> {
    const outcomes = await refreshOrbits(repositories, fetchOrbits, clock.now()).catch(() => null);
    setStatus(!outcomes || anyFailed(outcomes) ? 'failed' : 'idle');
    if (outcomes && orbitsChanged(outcomes)) {
      await onOrbitsChanged();
    }
  }

  function refresh(): Promise<void> {
    if (!inFlight) {
      setStatus('checking');
      inFlight = check().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  }

  return {
    getStatus: () => status,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    refresh,

    start() {
      refresh();
      let wasConnected: boolean | null = null;
      const stopNetwork = NetInfo.addEventListener((state) => {
        if (state.isConnected && wasConnected === false) {
          refresh();
        }
        wasConnected = state.isConnected;
      });
      const appState = AppState.addEventListener('change', (next) => {
        if (next === 'active') {
          refresh();
        }
      });
      return () => {
        stopNetwork();
        appState.remove();
      };
    },
  };
}
