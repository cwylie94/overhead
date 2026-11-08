import { createContext, useContext, type ReactNode } from 'react';

import type { AppData } from './client';

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ data, children }: { data: AppData; children: ReactNode }) {
  return <AppDataContext.Provider value={data}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const data = useContext(AppDataContext);
  if (!data) {
    throw new Error('useAppData must be used inside an AppDataProvider');
  }
  return data;
}
