import { eq, isNotNull, max } from 'drizzle-orm';

import { dockingHosts } from '@/domain/docking';

import type { Database } from '../database';
import { orbits } from '../schema';
import { chunk, excluded } from './helpers';
import type { OrbitRepository } from './types';

function refreshDockingHosts(db: Database): void {
  const stored = db
    .select({ noradId: orbits.noradId, omm: orbits.omm, dockedTo: orbits.dockedTo })
    .from(orbits)
    .all();
  const hosts = dockingHosts(stored.map((row) => row.omm));
  for (const { noradId, dockedTo } of stored) {
    const host = hosts.get(noradId) ?? null;
    if (host !== dockedTo) {
      db.update(orbits).set({ dockedTo: host }).where(eq(orbits.noradId, noradId)).run();
    }
  }
}

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
        refreshDockingHosts(tx);
      });
    },

    getById(noradId) {
      return db.select().from(orbits).where(eq(orbits.noradId, noradId)).get();
    },

    listAll() {
      return db.select().from(orbits).all();
    },

    dockingHosts() {
      const docked = db
        .select({ noradId: orbits.noradId, dockedTo: orbits.dockedTo })
        .from(orbits)
        .where(isNotNull(orbits.dockedTo))
        .all();
      return new Map(docked.map((row) => [row.noradId, row.dockedTo!]));
    },

    refreshDockingHosts() {
      db.transaction((tx) => refreshDockingHosts(tx));
    },

    latestFetchedAt(group) {
      const row = db
        .select({ value: max(orbits.fetchedAt) })
        .from(orbits)
        .where(eq(orbits.group, group))
        .get();
      return row?.value ?? undefined;
    },
  };
}
