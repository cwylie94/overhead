import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { createRepositories } from './repositories';
import * as schema from './schema';

const DATABASE_NAME = 'overhead.db';

const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
sqlite.execSync('PRAGMA journal_mode = WAL;');

export const db = drizzle(sqlite, { schema });

export const repositories = createRepositories(db);
