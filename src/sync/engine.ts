import type { Repositories } from '@/data/repositories';
import type { OutboxEntry } from '@/data/schema';

import type { SyncTransport } from './transport';
import { MAX_PUSH_BATCH, type PushChange } from '../../server/src/protocol';

export const PULL_CURSOR_KEY = 'sync.pullCursor';
const ALL_PENDING = Number.MAX_SAFE_INTEGER;

type SyncRepositories = Pick<Repositories, 'outbox' | 'sightings' | 'syncMeta'>;

function toChange(entry: OutboxEntry): PushChange {
  return {
    id: entry.id,
    entity: entry.entity,
    operation: entry.operation,
    payload: entry.payload,
  } as PushChange;
}

export async function pushOutbox(
  repositories: SyncRepositories,
  transport: SyncTransport,
  accountId: string,
): Promise<number> {
  const { outbox, sightings } = repositories;
  let pushed = 0;

  for (;;) {
    const batch = outbox.listPending(MAX_PUSH_BATCH);
    if (batch.length === 0) {
      return pushed;
    }
    const ids = batch.map((entry) => entry.id);
    outbox.recordAttempt(ids);

    const { accepted } = await transport.push(accountId, batch.map(toChange));
    const confirmed = new Set(accepted);
    const done = batch.filter((entry) => confirmed.has(entry.id));
    if (done.length === 0) {
      return pushed;
    }
    outbox.remove(done.map((entry) => entry.id));

    const stillPending = new Set(outbox.listPending(ALL_PENDING).map((entry) => entry.entityId));
    sightings.markSynced(
      [...new Set(done.map((entry) => entry.entityId))].filter((id) => !stillPending.has(id)),
    );
    pushed += done.length;
  }
}

export async function pullChanges(
  repositories: SyncRepositories,
  transport: SyncTransport,
  accountId: string,
): Promise<number> {
  const { sightings, syncMeta } = repositories;
  let cursor = Number(syncMeta.get(PULL_CURSOR_KEY) ?? 0);
  let applied = 0;

  for (;;) {
    const page = await transport.pull(accountId, cursor);
    applied += sightings.applyRemote(page.changes);
    cursor = page.cursor;
    syncMeta.set(PULL_CURSOR_KEY, String(cursor));
    if (!page.hasMore) {
      return applied;
    }
  }
}

export async function syncSightings(
  repositories: SyncRepositories,
  transport: SyncTransport,
  accountId: string,
): Promise<{ pushed: number; pulled: number }> {
  const pushed = await pushOutbox(repositories, transport, accountId);
  const pulled = await pullChanges(repositories, transport, accountId);
  return { pushed, pulled };
}
