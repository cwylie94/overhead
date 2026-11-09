import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import BetterSqlite3 from 'better-sqlite3';

import type { D1Like } from '../d1';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));

type Params = (string | number | null)[];

export function createFakeD1(): D1Like {
  const sqlite = new BetterSqlite3(':memory:');
  for (const migration of MIGRATIONS) {
    sqlite.exec(migration);
  }

  class Statement {
    constructor(
      readonly sql: string,
      readonly params: Params = [],
    ) {}

    bind(...params: Params) {
      return new Statement(this.sql, params);
    }

    execute() {
      const prepared = sqlite.prepare(this.sql);
      return prepared.reader ? prepared.all(...this.params) : prepared.run(...this.params);
    }

    async all() {
      return { results: sqlite.prepare(this.sql).all(...this.params), success: true, meta: {} };
    }

    async first() {
      return sqlite.prepare(this.sql).get(...this.params) ?? null;
    }

    async run() {
      sqlite.prepare(this.sql).run(...this.params);
      return { results: [], success: true, meta: {} };
    }
  }

  const database = {
    prepare: (sql: string) => new Statement(sql),
    batch: async (statements: Statement[]) =>
      sqlite.transaction(() => statements.map((statement) => statement.execute()))(),
  };
  return database as unknown as D1Like;
}
