import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { db, repositories } from './client';
import migrations from './migrations/migrations';
import { bundledSnapshot, importSnapshot } from './snapshot';

let preparation: Promise<void> | undefined;

export function prepareDatabase(): Promise<void> {
  preparation ??= migrate(db, migrations).then(() => {
    importSnapshot(repositories, bundledSnapshot);
  });
  return preparation;
}
