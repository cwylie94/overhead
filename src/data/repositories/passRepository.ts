import { and, asc, eq, gt, lt } from 'drizzle-orm';

import type { Database } from '../database';
import { passes } from '../schema';
import { chunk } from './helpers';
import type { PassRepository } from './types';

export function createPassRepository(db: Database): PassRepository {
  return {
    replaceAll(rows) {
      db.transaction((tx) => {
        tx.delete(passes).run();
        for (const batch of chunk(rows)) {
          tx.insert(passes).values(batch).run();
        }
      });
    },

    getById(id) {
      return db.select().from(passes).where(eq(passes.id, id)).get();
    },

    listBetween(from, to) {
      return db
        .select()
        .from(passes)
        .where(and(gt(passes.endAt, from), lt(passes.startAt, to)))
        .orderBy(asc(passes.startAt))
        .all();
    },

    nextForSatellite(noradId, after) {
      return db
        .select()
        .from(passes)
        .where(and(eq(passes.noradId, noradId), gt(passes.endAt, after)))
        .orderBy(asc(passes.startAt))
        .limit(1)
        .get();
    },
  };
}
