import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { repositories } from '@/data/client';
import { usePassCache } from '@/data/passCache/PassCacheScheduler';
import { UUID_RANDOM_BYTES, uuidv7 } from '@/domain/uuid';
import { useClock } from '@/environment/clock';
import { useSyncStore } from '@/stores/syncStore';

import { httpOrbitFetcher } from './celestrak';
import { orbitsChanged, runSync } from './runSync';
import { httpTransport } from './transport';

export const SYNC_URL = process.env.EXPO_PUBLIC_SYNC_URL ?? null;

type SyncContextValue = { syncNow(): Promise<void>; configured: boolean };

const SyncContext = createContext<SyncContextValue>({
  syncNow: async () => {},
  configured: false,
});

const transport = SYNC_URL ? httpTransport(SYNC_URL) : null;
const fetchOrbits = httpOrbitFetcher();

export function SyncProvider({ children }: { children: ReactNode }) {
  const clock = useClock();
  const { refresh: refreshPasses } = usePassCache();
  const inFlight = useRef<Promise<void> | null>(null);

  const syncNow = useCallback(() => {
    if (inFlight.current) {
      return inFlight.current;
    }
    const store = useSyncStore.getState();
    if (store.accountId === null) {
      store.setAccountId(uuidv7(clock.now(), Crypto.getRandomBytes(UUID_RANDOM_BYTES)));
    }
    store.syncStarted();

    const run = runSync({
      repositories,
      transport,
      fetchOrbits,
      accountId: useSyncStore.getState().accountId!,
      now: () => clock.now(),
    })
      .then(async (report) => {
        useSyncStore.getState().syncSucceeded(clock.now());
        if (orbitsChanged(report)) {
          await refreshPasses();
        }
      })
      .catch((error: unknown) => {
        useSyncStore.getState().syncFailed(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = run;
    return run;
  }, [clock, refreshPasses]);

  useEffect(() => {
    syncNow();
    let wasConnected: boolean | null = null;
    const network = NetInfo.addEventListener((state) => {
      if (state.isConnected && wasConnected === false) {
        syncNow();
      }
      wasConnected = state.isConnected;
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        syncNow();
      }
    });
    return () => {
      network();
      appState.remove();
    };
  }, [syncNow]);

  return (
    <SyncContext.Provider value={{ syncNow, configured: transport !== null }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  return useContext(SyncContext);
}
