import { eq } from 'drizzle-orm';

import type { Database } from '../database';
import { syncMeta } from '../schema';
import type { SyncMetaRepository } from './types';

export function createSyncMetaRepository(db: Database): SyncMetaRepository {
  return {
    get(key) {
      return db.select().from(syncMeta).where(eq(syncMeta.key, key)).get()?.value;
    },

    set(key, value) {
      db.insert(syncMeta)
        .values({ key, value })
        .onConflictDoUpdate({ target: syncMeta.key, set: { value } })
        .run();
    },
  };
}
