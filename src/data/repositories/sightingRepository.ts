import { desc, eq, inArray } from 'drizzle-orm';

import type { Database } from '../database';
import { outbox, sightings } from '../schema';
import type { SightingRepository } from './types';

export function createSightingRepository(db: Database): SightingRepository {
  return {
    log(sighting, now) {
      return db.transaction((tx) => {
        const row = tx
          .insert(sightings)
          .values({ ...sighting, updatedAt: now, syncStatus: 'pending' })
          .returning()
          .get();

        tx.insert(outbox)
          .values({
            entity: 'sighting',
            entityId: row.id,
            operation: 'insert',
            payload: row,
            createdAt: now,
          })
          .run();

        return row;
      });
    },

    updateNote(id, note, now) {
      db.transaction((tx) => {
        const updated = tx
          .update(sightings)
          .set({ note, updatedAt: now, syncStatus: 'pending' })
          .where(eq(sightings.id, id))
          .returning({ id: sightings.id })
          .get();

        if (!updated) {
          throw new Error(`Sighting ${id} not found`);
        }

        tx.insert(outbox)
          .values({
            entity: 'sighting',
            entityId: id,
            operation: 'update',
            payload: { id, note, updatedAt: now },
            createdAt: now,
          })
          .run();
      });
    },

    delete(id, now) {
      db.transaction((tx) => {
        const removed = tx
          .delete(sightings)
          .where(eq(sightings.id, id))
          .returning({ id: sightings.id })
          .get();

        if (!removed) {
          throw new Error(`Sighting ${id} not found`);
        }

        tx.insert(outbox)
          .values({
            entity: 'sighting',
            entityId: id,
            operation: 'delete',
            payload: { id, updatedAt: now },
            createdAt: now,
          })
          .run();
      });
    },

    getById(id) {
      return db.select().from(sightings).where(eq(sightings.id, id)).get();
    },

    listAll() {
      return db.select().from(sightings).orderBy(desc(sightings.observedAt)).all();
    },

    listForSatellite(noradId) {
      return db
        .select()
        .from(sightings)
        .where(eq(sightings.noradId, noradId))
        .orderBy(desc(sightings.observedAt))
        .all();
    },

    applyRemote(rows) {
      return db.transaction((tx) => {
        let applied = 0;
        for (const { deletedAt, ...row } of rows) {
          const existing = tx.select().from(sightings).where(eq(sightings.id, row.id)).get();
          if (deletedAt != null) {
            if (existing) {
              tx.delete(sightings).where(eq(sightings.id, row.id)).run();
              applied += 1;
            }
            continue;
          }
          if (!existing) {
            tx.insert(sightings)
              .values({ ...row, syncStatus: 'synced' })
              .run();
            applied += 1;
          } else if (existing.syncStatus !== 'pending' && existing.note !== row.note) {
            tx.update(sightings)
              .set({ note: row.note, updatedAt: row.updatedAt })
              .where(eq(sightings.id, row.id))
              .run();
            applied += 1;
          }
        }
        return applied;
      });
    },

    markSynced(ids) {
      if (ids.length === 0) {
        return;
      }
      db.update(sightings).set({ syncStatus: 'synced' }).where(inArray(sightings.id, ids)).run();
    },
  };
}
