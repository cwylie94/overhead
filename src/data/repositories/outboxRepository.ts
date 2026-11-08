import { asc, count, inArray, sql } from 'drizzle-orm';

import type { Database } from '../database';
import { outbox } from '../schema';
import type { OutboxRepository } from './types';

export function createOutboxRepository(db: Database): OutboxRepository {
  return {
    listPending(limit) {
      return db.select().from(outbox).orderBy(asc(outbox.id)).limit(limit).all();
    },

    count() {
      return db.select({ value: count() }).from(outbox).get()?.value ?? 0;
    },

    recordAttempt(ids) {
      if (ids.length === 0) {
        return;
      }
      db.update(outbox)
        .set({ attempts: sql`${outbox.attempts} + 1` })
        .where(inArray(outbox.id, ids))
        .run();
    },

    remove(ids) {
      if (ids.length === 0) {
        return;
      }
      db.delete(outbox).where(inArray(outbox.id, ids)).run();
    },
  };
}
