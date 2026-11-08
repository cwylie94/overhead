import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';

import { useClock, useNow } from '@/environment/clock';
import { useLocation } from '@/environment/location';
import { useSettingsStore } from '@/stores/settingsStore';

import type { PassCacheRunner, PassCacheState } from './runner';

const CHECK_EVERY = 10 * 60_000;

const PassCacheContext = createContext<PassCacheRunner | null>(null);

type PassCacheProviderProps = {
  runner: PassCacheRunner;
  children: ReactNode;
};

export function PassCacheProvider({ runner, children }: PassCacheProviderProps) {
  return (
    <PassCacheContext.Provider value={runner}>
      <PassCacheScheduler runner={runner} />
      {children}
    </PassCacheContext.Provider>
  );
}

function PassCacheScheduler({ runner }: { runner: PassCacheRunner }) {
  const { state } = useLocation();
  const minElevation = useSettingsStore((settings) => settings.minElevation);
  const clock = useClock();
  const tick = useNow(CHECK_EVERY);
  const observer = state.status === 'ready' ? state.observer : null;

  useEffect(() => {
    if (observer) {
      runner.request({ observer, minElevation, now: clock.now() });
    }
  }, [runner, observer, minElevation, clock, tick]);

  return null;
}

function useRunner(): PassCacheRunner {
  const runner = useContext(PassCacheContext);
  if (!runner) {
    throw new Error('usePassCache must be used inside a PassCacheProvider');
  }
  return runner;
}

export function usePassCache(): { state: PassCacheState; refresh(): Promise<void> } {
  const runner = useRunner();
  const state = useSyncExternalStore(runner.subscribe, runner.getState);
  const location = useLocation();
  const minElevation = useSettingsStore((settings) => settings.minElevation);
  const clock = useClock();

  return {
    state,
    refresh: async () => {
      if (location.state.status === 'ready') {
        await runner.request(
          { observer: location.state.observer, minElevation, now: clock.now() },
          true,
        );
      }
    },
  };
}
