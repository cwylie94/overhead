import { readFileSync } from 'node:fs';
import path from 'node:path';

import BetterSqlite3 from 'better-sqlite3';

const MIGRATION = readFileSync(path.resolve(__dirname, '../../migrations/0001_init.sql'), 'utf8');

type Params = (string | number | null)[];

export function createFakeD1(): D1Database {
  const sqlite = new BetterSqlite3(':memory:');
  sqlite.exec(MIGRATION);

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
  return database as unknown as D1Database;
}
