import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { deleteDatabaseSync, openDatabaseSync } from 'expo-sqlite';

import { computePassRowsOnWorker } from './passCache/passWorker';
import { createPassCacheRunner, type PassCacheRunner } from './passCache/runner';
import { createRepositories, type Repositories } from './repositories';
import * as schema from './schema';

export const DEVICE_DATABASE = 'overhead.db';
export const DEMO_DATABASE = 'overhead-demo.db';

export type AppData = {
  key: string;
  db: ExpoSQLiteDatabase<typeof schema>;
  repositories: Repositories;
  passCacheRunner: PassCacheRunner;
};

type OpenAppData = AppData & { close(): void };

function openAppData(name: string, key: string, { wal }: { wal: boolean }): OpenAppData {
  const sqlite = openDatabaseSync(name, { enableChangeListener: true });
  if (wal) {
    sqlite.execSync('PRAGMA journal_mode = WAL;');
  }
  const db = drizzle(sqlite, { schema });
  const repositories = createRepositories(db);
  return {
    key,
    db,
    repositories,
    passCacheRunner: createPassCacheRunner(repositories, { computeRows: computePassRowsOnWorker }),
    close: () => sqlite.closeSync(),
  };
}

function deleteIfPresent(name: string): boolean {
  try {
    deleteDatabaseSync(name);
    return true;
  } catch {
    return false;
  }
}

let device: OpenAppData | null = null;
let demo: OpenAppData | null = null;
let demoRuns = 0;

export function deviceData(): AppData {
  device ??= openAppData(DEVICE_DATABASE, 'device', { wal: true });
  return device;
}

export function freshDemoData(): AppData {
  demo?.close();
  deleteIfPresent(DEMO_DATABASE);
  demoRuns += 1;
  demo = openAppData(DEMO_DATABASE, `demo-${demoRuns}`, { wal: false });
  return demo;
}
