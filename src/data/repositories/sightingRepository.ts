import { desc, eq } from 'drizzle-orm';

import type { Database } from '../database';
import { sightings } from '../schema';
import type { SightingRepository } from './types';

export function createSightingRepository(db: Database): SightingRepository {
  return {
    log(sighting) {
      return db.insert(sightings).values(sighting).returning().get();
    },

    updateNote(id, note) {
      const updated = db
        .update(sightings)
        .set({ note })
        .where(eq(sightings.id, id))
        .returning({ id: sightings.id })
        .get();
      if (!updated) {
        throw new Error(`Sighting ${id} not found`);
      }
    },

    delete(id) {
      const removed = db
        .delete(sightings)
        .where(eq(sightings.id, id))
        .returning({ id: sightings.id })
        .get();
      if (!removed) {
        throw new Error(`Sighting ${id} not found`);
      }
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
  };
}
