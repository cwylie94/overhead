import { asc, eq } from 'drizzle-orm';

import type { Database } from '../database';
import { satellites } from '../schema';
import { chunk, excluded } from './helpers';
import type { SatelliteRepository } from './types';

export function createSatelliteRepository(db: Database): SatelliteRepository {
  return {
    upsertMany(rows) {
      db.transaction((tx) => {
        for (const batch of chunk(rows)) {
          tx.insert(satellites)
            .values(batch)
            .onConflictDoUpdate({
              target: satellites.noradId,
              set: {
                name: excluded(satellites.name),
                objectType: excluded(satellites.objectType),
                owner: excluded(satellites.owner),
                launchDate: excluded(satellites.launchDate),
                rarity: excluded(satellites.rarity),
              },
            })
            .run();
        }
      });
    },

    getById(noradId) {
      return db.select().from(satellites).where(eq(satellites.noradId, noradId)).get();
    },

    listAll() {
      return db.select().from(satellites).orderBy(asc(satellites.name)).all();
    },
  };
}
