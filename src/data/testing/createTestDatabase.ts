import path from 'node:path';

import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { Database } from '../database';
import * as schema from '../schema';

const MIGRATIONS_FOLDER = path.resolve(__dirname, '../migrations');

export function createTestDatabase(): Database {
  const db = drizzle(new BetterSqlite3(':memory:'), { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
