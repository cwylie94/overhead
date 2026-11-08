import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import type { AppData } from './client';
import migrations from './migrations/migrations';
import { bundledSnapshot, importSnapshot } from './snapshot';

const preparations = new WeakMap<AppData, Promise<void>>();

export function prepareDatabase(data: AppData): Promise<void> {
  let preparation = preparations.get(data);
  if (!preparation) {
    preparation = migrate(data.db, migrations).then(() => {
      importSnapshot(data.repositories, bundledSnapshot);
    });
    preparations.set(data, preparation);
  }
  return preparation;
}
