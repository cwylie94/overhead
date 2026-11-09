import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from './storage';

export type RefreshStatus = 'idle' | 'checking' | 'failed';

type OrbitRefreshState = {
  status: RefreshStatus;
  lastCheckedAt: number | null;
};

type OrbitRefreshActions = {
  checkStarted(): void;
  checkFinished(at: number, failed: boolean): void;
};

export const useOrbitRefreshStore = create<OrbitRefreshState & OrbitRefreshActions>()(
  persist(
    (set) => ({
      status: 'idle',
      lastCheckedAt: null,

      checkStarted: () =>
        set((state) => (state.status === 'checking' ? state : { status: 'checking' })),
      checkFinished: (at, failed) =>
        set((state) =>
          state.status === 'checking'
            ? { status: failed ? 'failed' : 'idle', lastCheckedAt: at }
            : state,
        ),
    }),
    {
      name: 'orbitRefresh',
      version: 1,
      storage: persistStorage,
      partialize: ({ lastCheckedAt }) => ({ lastCheckedAt }),
    },
  ),
);
