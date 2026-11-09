import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAppData } from '@/data/AppDataContext';
import { usePassCache } from '@/data/passCache/PassCacheScheduler';
import { useClock } from '@/environment/clock';
import { useOrbitRefreshStore } from '@/stores/orbitRefreshStore';

import { anyFailed, httpOrbitFetcher, orbitsChanged, refreshOrbits } from './celestrak';

const fetchOrbits = httpOrbitFetcher();

type OrbitRefreshProviderProps = { enabled: boolean; children: ReactNode };

export function OrbitRefreshProvider({ enabled, children }: OrbitRefreshProviderProps) {
  const { repositories } = useAppData();
  const clock = useClock();
  const { refresh: refreshPasses } = usePassCache();
  const inFlight = useRef<Promise<void> | null>(null);

  const refreshNow = useCallback(() => {
    if (!enabled) {
      return Promise.resolve();
    }
    if (inFlight.current) {
      return inFlight.current;
    }
    useOrbitRefreshStore.getState().checkStarted();

    const run = refreshOrbits(repositories, fetchOrbits, clock.now())
      .then(async (outcomes) => {
        useOrbitRefreshStore.getState().checkFinished(clock.now(), anyFailed(outcomes));
        if (orbitsChanged(outcomes)) {
          await refreshPasses();
        }
      })
      .catch(() => {
        useOrbitRefreshStore.getState().checkFinished(clock.now(), true);
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = run;
    return run;
  }, [enabled, repositories, clock, refreshPasses]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    refreshNow();
    let wasConnected: boolean | null = null;
    const network = NetInfo.addEventListener((state) => {
      if (state.isConnected && wasConnected === false) {
        refreshNow();
      }
      wasConnected = state.isConnected;
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        refreshNow();
      }
    });
    return () => {
      network();
      appState.remove();
    };
  }, [enabled, refreshNow]);

  return children;
}
