import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing/createTestDatabase';

import { createApp } from '../../../server/src/app';
import type { PullResponse, PushResponse } from '../../../server/src/protocol';
import { createFakeD1 } from '../../../server/src/testing/fakeD1';
import { PULL_CURSOR_KEY, pullChanges, pushOutbox, syncSightings } from '../engine';
import type { SyncTransport } from '../transport';

const ACCOUNT = '0193a6f0-0000-7000-8000-00000000a11c';
const NOW = Date.UTC(2026, 10, 8, 21, 14);

function createServer() {
  const app = createApp();
  const env = { DB: createFakeD1() };

  const transport: SyncTransport = {
    async push(accountId, changes) {
      const response = await app.request(
        '/sync/push',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Account-Id': accountId },
          body: JSON.stringify({ changes }),
        },
        env,
      );
      return (await response.json()) as PushResponse;
    },
    async pull(accountId, since) {
      const response = await app.request(
        `/sync/pull?since=${since}`,
        { headers: { 'X-Account-Id': accountId } },
        env,
      );
      return (await response.json()) as PullResponse;
    },
  };
  return { transport, env };
}

function createDevice(): Repositories {
  return createRepositories(createTestDatabase());
}

function catchIss(device: Repositories, id: string) {
  return device.sightings.log(
    { id, noradId: 25544, observedAt: NOW, verified: true, angleError: 3.1 },
    NOW,
  );
}

async function serverCount(server: ReturnType<typeof createServer>) {
  return (await server.transport.pull(ACCOUNT, 0)).changes.length;
}

describe('sync engine against the Worker', () => {
  test('pushes the outbox, then clears it and marks the sighting synced', async () => {
    const server = createServer();
    const device = createDevice();
    catchIss(device, 'a');

    expect(await pushOutbox(device, server.transport, ACCOUNT)).toBe(1);

    expect(device.outbox.count()).toBe(0);
    expect(device.sightings.getById('a')?.syncStatus).toBe('synced');
    expect(await serverCount(server)).toBe(1);
  });

  test('a crash after the server applied a push loses nothing and duplicates nothing', async () => {
    const server = createServer();
    const device = createDevice();
    catchIss(device, 'a');
    const crashing: SyncTransport = {
      ...server.transport,
      async push(accountId, changes) {
        await server.transport.push(accountId, changes);
        throw new Error('connection reset');
      },
    };

    await expect(pushOutbox(device, crashing, ACCOUNT)).rejects.toThrow('connection reset');
    expect(device.outbox.count()).toBe(1);
    expect(device.outbox.listPending(10)[0]?.attempts).toBe(1);

    await pushOutbox(device, server.transport, ACCOUNT);

    expect(device.outbox.count()).toBe(0);
    expect(await serverCount(server)).toBe(1);
  });

  test('a failed push leaves the outbox and the pull cursor alone', async () => {
    const server = createServer();
    const device = createDevice();
    catchIss(device, 'a');
    const offline: SyncTransport = {
      push: async () => Promise.reject(new Error('offline')),
      pull: async () => Promise.reject(new Error('offline')),
    };

    await expect(syncSightings(device, offline, ACCOUNT)).rejects.toThrow('offline');

    expect(device.outbox.count()).toBe(1);
    expect(device.syncMeta.get(PULL_CURSOR_KEY)).toBeUndefined();
    expect(await serverCount(server)).toBe(0);
  });

  test("a second device pulls the first device's sightings and the cursor advances", async () => {
    const server = createServer();
    const phone = createDevice();
    const tablet = createDevice();
    catchIss(phone, 'a');
    await syncSightings(phone, server.transport, ACCOUNT);

    expect(await pullChanges(tablet, server.transport, ACCOUNT)).toBe(1);
    expect(tablet.sightings.getById('a')).toMatchObject({ verified: true, syncStatus: 'synced' });
    expect(tablet.outbox.count()).toBe(0);
    const cursor = Number(tablet.syncMeta.get(PULL_CURSOR_KEY));
    expect(cursor).toBeGreaterThan(0);

    expect(await pullChanges(tablet, server.transport, ACCOUNT)).toBe(0);
    expect(Number(tablet.syncMeta.get(PULL_CURSOR_KEY))).toBe(cursor);
  });

  test('pulling the same page twice is harmless', async () => {
    const server = createServer();
    const phone = createDevice();
    const tablet = createDevice();
    catchIss(phone, 'a');
    await syncSightings(phone, server.transport, ACCOUNT);

    await pullChanges(tablet, server.transport, ACCOUNT);
    tablet.syncMeta.set(PULL_CURSOR_KEY, '0');
    await pullChanges(tablet, server.transport, ACCOUNT);

    expect(tablet.sightings.listAll()).toHaveLength(1);
  });

  test('note edits travel between devices and the last one to reach the server wins', async () => {
    const server = createServer();
    const phone = createDevice();
    const tablet = createDevice();
    catchIss(phone, 'a');
    await syncSightings(phone, server.transport, ACCOUNT);
    await syncSightings(tablet, server.transport, ACCOUNT);

    phone.sightings.updateNote('a', 'from the phone', NOW + 1_000);
    tablet.sightings.updateNote('a', 'from the tablet', NOW + 500);
    await syncSightings(phone, server.transport, ACCOUNT);

    await syncSightings(tablet, server.transport, ACCOUNT);
    await syncSightings(phone, server.transport, ACCOUNT);

    expect(phone.sightings.getById('a')?.note).toBe('from the tablet');
    expect(tablet.sightings.getById('a')?.note).toBe('from the tablet');
  });

  test('a deletion travels to the other device', async () => {
    const server = createServer();
    const phone = createDevice();
    const tablet = createDevice();
    catchIss(phone, 'a');
    catchIss(phone, 'b');
    await syncSightings(phone, server.transport, ACCOUNT);
    await syncSightings(tablet, server.transport, ACCOUNT);

    phone.sightings.delete('a', NOW + 1_000);
    await syncSightings(phone, server.transport, ACCOUNT);
    await syncSightings(tablet, server.transport, ACCOUNT);

    expect(tablet.sightings.listAll().map((sighting) => sighting.id)).toEqual(['b']);
    expect(phone.outbox.count()).toBe(0);
  });

  test('a sighting deleted before it ever synced never reaches the other device', async () => {
    const server = createServer();
    const phone = createDevice();
    const tablet = createDevice();
    catchIss(phone, 'a');
    phone.sightings.delete('a', NOW + 1_000);

    await syncSightings(phone, server.transport, ACCOUNT);
    await syncSightings(tablet, server.transport, ACCOUNT);

    expect(tablet.sightings.listAll()).toEqual([]);
  });

  test('an unpushed local edit is not overwritten by a pull', async () => {
    const server = createServer();
    const phone = createDevice();
    const tablet = createDevice();
    catchIss(phone, 'a');
    await syncSightings(phone, server.transport, ACCOUNT);
    await syncSightings(tablet, server.transport, ACCOUNT);
    phone.sightings.updateNote('a', 'phone note', NOW + 1_000);
    await syncSightings(phone, server.transport, ACCOUNT);
    tablet.sightings.updateNote('a', 'tablet draft', NOW + 2_000);

    await pullChanges(tablet, server.transport, ACCOUNT);

    expect(tablet.sightings.getById('a')?.note).toBe('tablet draft');
  });

  test('pushes and pulls more than one batch or page', async () => {
    const server = createServer();
    const phone = createDevice();
    const tablet = createDevice();
    for (let index = 0; index < 520; index++) {
      catchIss(phone, `s${String(index).padStart(3, '0')}`);
    }

    await syncSightings(phone, server.transport, ACCOUNT);
    await pullChanges(tablet, server.transport, ACCOUNT);

    expect(phone.outbox.count()).toBe(0);
    expect(tablet.sightings.listAll()).toHaveLength(520);
  });
});
