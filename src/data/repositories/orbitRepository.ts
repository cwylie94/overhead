import { eq } from 'drizzle-orm';

import type { Database } from '../database';
import { orbits } from '../schema';
import { chunk, excluded } from './helpers';
import type { OrbitRepository } from './types';

export function createOrbitRepository(db: Database): OrbitRepository {
  return {
    replaceGroup(group, rows) {
      db.transaction((tx) => {
        tx.delete(orbits).where(eq(orbits.group, group)).run();
        for (const batch of chunk(rows)) {
          tx.insert(orbits)
            .values(batch.map((row) => ({ ...row, group })))
            .onConflictDoUpdate({
              target: orbits.noradId,
              set: {
                group: excluded(orbits.group),
                omm: excluded(orbits.omm),
                epoch: excluded(orbits.epoch),
                fetchedAt: excluded(orbits.fetchedAt),
              },
            })
            .run();
        }
      });
    },

    getById(noradId) {
      return db.select().from(orbits).where(eq(orbits.noradId, noradId)).get();
    },

    listAll() {
      return db.select().from(orbits).all();
    },
  };
}
