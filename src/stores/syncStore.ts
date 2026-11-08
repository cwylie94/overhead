import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from './storage';

export type SyncStatus = 'idle' | 'syncing' | 'error';

type SyncState = {
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastError: string | null;
};

type SyncActions = {
  syncStarted(): void;
  syncSucceeded(at: number): void;
  syncFailed(message: string): void;
};

export const useSyncStore = create<SyncState & SyncActions>()(
  persist(
    (set) => ({
      status: 'idle',
      lastSyncedAt: null,
      lastError: null,

      syncStarted: () =>
        set((state) => (state.status === 'syncing' ? state : { status: 'syncing' })),
      syncSucceeded: (at) =>
        set((state) =>
          state.status === 'syncing'
            ? { status: 'idle', lastSyncedAt: at, lastError: null }
            : state,
        ),
      syncFailed: (message) =>
        set((state) =>
          state.status === 'syncing' ? { status: 'error', lastError: message } : state,
        ),
    }),
    {
      name: 'sync',
      version: 1,
      storage: persistStorage,
      partialize: ({ lastSyncedAt }) => ({ lastSyncedAt }),
    },
  ),
);
