import { Hono } from 'hono';

import type { D1Like } from './d1';
import {
  ACCOUNT_HEADER,
  MAX_PUSH_BATCH,
  PULL_PAGE_SIZE,
  type PullResponse,
  type PushChange,
  type PushResponse,
  type ServerSighting,
} from './protocol';

export type Env = { Bindings: { DB: D1Like }; Variables: { accountId: string } };

const ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type SightingRow = {
  id: string;
  norad_id: number;
  observed_at: number;
  verified: number;
  angle_error: number | null;
  note: string | null;
  updated_at: number;
  version: number;
  deleted_at: number | null;
};

function isChange(value: unknown): value is PushChange {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const change = value as Partial<PushChange> & { payload?: Record<string, unknown> };
  if (typeof change.id !== 'number' || change.entity !== 'sighting' || !change.payload) {
    return false;
  }
  const payload = change.payload;
  if (typeof payload.id !== 'string' || typeof payload.updatedAt !== 'number') {
    return false;
  }
  if (change.operation === 'update') {
    return payload.note === null || typeof payload.note === 'string';
  }
  if (change.operation === 'delete') {
    return true;
  }
  return (
    change.operation === 'insert' &&
    typeof payload.noradId === 'number' &&
    typeof payload.observedAt === 'number' &&
    typeof payload.verified === 'boolean'
  );
}

function toServerSighting(row: SightingRow): ServerSighting {
  return {
    id: row.id,
    noradId: row.norad_id,
    observedAt: row.observed_at,
    verified: row.verified === 1,
    angleError: row.angle_error,
    note: row.note,
    updatedAt: row.updated_at,
    version: row.version,
    deletedAt: row.deleted_at,
  };
}

export function createApp() {
  const app = new Hono<Env>();

  app.get('/health', (c) => c.json({ ok: true }));

  app.use('/sync/*', async (c, next) => {
    const accountId = c.req.header(ACCOUNT_HEADER)?.toLowerCase();
    if (!accountId || !ACCOUNT_ID.test(accountId)) {
      return c.json({ error: 'A valid account id header is required' }, 401);
    }
    c.set('accountId', accountId);
    await next();
  });

  app.post('/sync/push', async (c) => {
    const body = await c.req.json<{ changes?: unknown }>().catch(() => null);
    const changes = body?.changes;
    if (!Array.isArray(changes) || changes.length > MAX_PUSH_BATCH || !changes.every(isChange)) {
      return c.json({ error: `Send up to ${MAX_PUSH_BATCH} valid changes` }, 400);
    }

    const accountId = c.get('accountId');
    const db = c.env.DB;
    const nextVersion = db
      .prepare('UPDATE accounts SET version = version + 1 WHERE id = ?')
      .bind(accountId);
    const currentVersion = '(SELECT version FROM accounts WHERE id = ?)';

    const statements = [
      db.prepare('INSERT OR IGNORE INTO accounts (id) VALUES (?)').bind(accountId),
    ];
    for (const change of changes) {
      statements.push(nextVersion);
      if (change.operation === 'insert') {
        const { id, noradId, observedAt, verified, angleError, note, updatedAt } = change.payload;
        statements.push(
          db
            .prepare(
              `INSERT INTO sightings (account_id, id, norad_id, observed_at, verified, angle_error, note, updated_at, version)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${currentVersion})
               ON CONFLICT (account_id, id) DO NOTHING`,
            )
            .bind(
              accountId,
              id,
              noradId,
              observedAt,
              verified ? 1 : 0,
              angleError ?? null,
              note ?? null,
              updatedAt,
              accountId,
            ),
        );
      } else if (change.operation === 'update') {
        const { id, note, updatedAt } = change.payload;
        statements.push(
          db
            .prepare(
              `UPDATE sightings SET note = ?, updated_at = ?, version = ${currentVersion}
               WHERE account_id = ? AND id = ? AND deleted_at IS NULL`,
            )
            .bind(note, updatedAt, accountId, accountId, id),
        );
      } else {
        const { id, updatedAt } = change.payload;
        statements.push(
          db
            .prepare(
              `UPDATE sightings SET deleted_at = ?, note = NULL, updated_at = ?, version = ${currentVersion}
               WHERE account_id = ? AND id = ? AND deleted_at IS NULL`,
            )
            .bind(updatedAt, updatedAt, accountId, accountId, id),
        );
      }
    }
    await db.batch(statements);

    const response: PushResponse = { accepted: changes.map((change) => change.id) };
    return c.json(response);
  });

  app.get('/sync/pull', async (c) => {
    const since = Number(c.req.query('since') ?? 0);
    if (!Number.isInteger(since) || since < 0) {
      return c.json({ error: 'since must be a non-negative integer' }, 400);
    }
    const { results } = await c.env.DB.prepare(
      `SELECT id, norad_id, observed_at, verified, angle_error, note, updated_at, version, deleted_at
       FROM sightings WHERE account_id = ? AND version > ? ORDER BY version LIMIT ?`,
    )
      .bind(c.get('accountId'), since, PULL_PAGE_SIZE)
      .all<SightingRow>();

    const changes = results.map(toServerSighting);
    const response: PullResponse = {
      changes,
      cursor: changes.length > 0 ? changes[changes.length - 1]!.version : since,
      hasMore: changes.length === PULL_PAGE_SIZE,
    };
    return c.json(response);
  });

  return app;
}
