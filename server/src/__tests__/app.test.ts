import { createApp } from '../app';
import type { PullResponse, PushChange, PushResponse } from '../protocol';
import { createFakeD1 } from '../testing/fakeD1';

const ALICE = '0193a6f0-0000-7000-8000-00000000a11c';
const BOB = '0193a6f0-0000-7000-8000-000000000b0b';

function sighting(id: string, outboxId = 1): PushChange {
  return {
    id: outboxId,
    entity: 'sighting',
    operation: 'insert',
    payload: {
      id,
      noradId: 25544,
      observedAt: 1_000,
      verified: true,
      angleError: 4.2,
      note: null,
      updatedAt: 1_000,
    },
  };
}

function setup() {
  const app = createApp();
  const env = { DB: createFakeD1() };
  const push = async (account: string, changes: PushChange[]) =>
    app.request(
      '/sync/push',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Account-Id': account },
        body: JSON.stringify({ changes }),
      },
      env,
    );
  const pull = async (account: string, since = 0) =>
    (await (
      await app.request(`/sync/pull?since=${since}`, { headers: { 'X-Account-Id': account } }, env)
    ).json()) as PullResponse;
  return { app, env, push, pull };
}

describe('sync worker', () => {
  test('accepts pushed sightings and returns them on pull with versions', async () => {
    const { push, pull } = setup();

    const response = await push(ALICE, [sighting('s1', 1), sighting('s2', 2)]);

    expect(response.status).toBe(200);
    expect(((await response.json()) as PushResponse).accepted).toEqual([1, 2]);
    const pulled = await pull(ALICE);
    expect(pulled.changes.map((change) => [change.id, change.version])).toEqual([
      ['s1', 1],
      ['s2', 2],
    ]);
    expect(pulled).toMatchObject({ cursor: 2, hasMore: false });
  });

  test('replaying a push is harmless', async () => {
    const { push, pull } = setup();

    await push(ALICE, [sighting('s1')]);
    const replay = await push(ALICE, [sighting('s1')]);

    expect(((await replay.json()) as PushResponse).accepted).toEqual([1]);
    expect((await pull(ALICE)).changes).toHaveLength(1);
  });

  test('pull only returns changes after the cursor', async () => {
    const { push, pull } = setup();
    await push(ALICE, [sighting('s1')]);
    const first = await pull(ALICE);

    await push(ALICE, [sighting('s2')]);
    const second = await pull(ALICE, first.cursor);

    expect(second.changes.map((change) => change.id)).toEqual(['s2']);
    expect(second.cursor).toBeGreaterThan(first.cursor);
    expect((await pull(ALICE, second.cursor)).changes).toEqual([]);
  });

  test('a note update bumps the version so other devices pull it, and the last write wins', async () => {
    const { push, pull } = setup();
    await push(ALICE, [sighting('s1')]);
    const { cursor } = await pull(ALICE);
    const note = (text: string, outboxId: number, updatedAt: number): PushChange => ({
      id: outboxId,
      entity: 'sighting',
      operation: 'update',
      payload: { id: 's1', note: text, updatedAt },
    });

    await push(ALICE, [note('first', 2, 2_000)]);
    await push(ALICE, [note('second', 3, 1_500)]);
    const changes = (await pull(ALICE, cursor)).changes;

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ id: 's1', note: 'second' });
  });

  test('keeps accounts apart', async () => {
    const { push, pull } = setup();

    await push(ALICE, [sighting('s1')]);

    expect((await pull(BOB)).changes).toEqual([]);
  });

  test('rejects requests without a valid account id', async () => {
    const { app, env } = setup();

    const response = await app.request('/sync/pull', { headers: { 'X-Account-Id': 'nope' } }, env);

    expect(response.status).toBe(401);
  });

  test('rejects malformed changes', async () => {
    const { push } = setup();
    const bad = [
      { id: 1, entity: 'sighting', operation: 'insert', payload: { id: 's1' } },
    ] as unknown as PushChange[];

    expect((await push(ALICE, bad)).status).toBe(400);
  });

  test('rejects batches over the limit', async () => {
    const { push } = setup();
    const changes = Array.from({ length: 101 }, (_, index) => sighting(`s${index}`, index));

    expect((await push(ALICE, changes)).status).toBe(400);
  });
});
