import fs from 'node:fs';
import path from 'node:path';

import BetterSqlite3 from 'better-sqlite3';

const MIGRATIONS = path.resolve(__dirname, '../migrations');

function apply(db: BetterSqlite3.Database, file: string) {
  const sql = fs.readFileSync(path.join(MIGRATIONS, file), 'utf8');
  for (const statement of sql.split('--> statement-breakpoint')) {
    if (statement.trim()) {
      db.exec(statement);
    }
  }
}

describe('0003_drop_sync.sql', () => {
  describe('given a database with a synced catch and an outbox entry for it', () => {
    let db: BetterSqlite3.Database;

    beforeEach(() => {
      db = new BetterSqlite3(':memory:');
      ['0000_init.sql', '0001_collection_sets.sql', '0002_standard_magnitude.sql'].forEach((file) =>
        apply(db, file),
      );
      db.prepare(
        `INSERT INTO sightings (id, norad_id, observed_at, verified, angle_error, note, updated_at, sync_status)
         VALUES ('a', 25544, 1000, 1, 4.2, 'Bright', 1000, 'synced')`,
      ).run();
      db.prepare(
        `INSERT INTO outbox (entity, entity_id, operation, payload, created_at)
         VALUES ('sighting', 'a', 'insert', '{}', 1000)`,
      ).run();
    });

    describe('when the sync columns are dropped', () => {
      beforeEach(() => {
        apply(db, '0003_drop_sync.sql');
      });

      test('then the catch is kept without its sync columns', () => {
        expect(db.prepare('SELECT * FROM sightings').all()).toEqual([
          { id: 'a', norad_id: 25544, observed_at: 1000, angle_error: 4.2, note: 'Bright' },
        ]);
      });

      test('then the outbox table is gone', () => {
        expect(
          db
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'outbox'")
            .all(),
        ).toEqual([]);
      });
    });
  });
});
