import { createRepositories } from '@/data/repositories';
import { bundledSnapshot, importSnapshot } from '@/data/snapshot';
import { createTestDatabase } from '@/data/testing/createTestDatabase';
import { makeOmm } from '@/data/testing/fixtures';

import { MIN_REFRESH_INTERVAL } from '../celestrak';
import { orbitsChanged, runSync } from '../runSync';
import type { SyncTransport } from '../transport';

const ACCOUNT = '0193a6f0-0000-7000-8000-00000000a11c';

function setup() {
  const repositories = createRepositories(createTestDatabase());
  importSnapshot(repositories, bundledSnapshot);
  return repositories;
}

describe('runSync', () => {
  test('refreshes orbits even when no sync server is set up', async () => {
    const report = await runSync({
      repositories: setup(),
      transport: null,
      fetchOrbits: async () => [makeOmm()],
      accountId: ACCOUNT,
      now: () => bundledSnapshot.fetchedAt + MIN_REFRESH_INTERVAL,
    });

    expect(report).toEqual({ orbits: { visual: 'updated', stations: 'updated' }, sightings: null });
    expect(orbitsChanged(report)).toBe(true);
  });

  test('syncs sightings when a server is set up, and reports no orbit change inside 2 hours', async () => {
    const transport: SyncTransport = {
      push: async (_, changes) => ({ accepted: changes.map((change) => change.id) }),
      pull: async (_, since) => ({ changes: [], cursor: since, hasMore: false }),
    };
    const fetchOrbits = jest.fn(async () => [makeOmm()]);

    const report = await runSync({
      repositories: setup(),
      transport,
      fetchOrbits,
      accountId: ACCOUNT,
      now: () => bundledSnapshot.fetchedAt + 1,
    });

    expect(report.sightings).toEqual({ pushed: 0, pulled: 0 });
    expect(orbitsChanged(report)).toBe(false);
    expect(fetchOrbits).not.toHaveBeenCalled();
  });
});
