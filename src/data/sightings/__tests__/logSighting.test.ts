import { createRepositories } from '../../repositories';
import { createTestDatabase } from '../../testing/createTestDatabase';
import { logSighting } from '../logSighting';

const NOW = Date.UTC(2026, 10, 8, 21, 14);
let counter = 0;
const context = {
  now: NOW,
  randomBytes: (count: number) => new Uint8Array(count).fill(++counter),
};

describe('logSighting', () => {
  test('stores a verified catch with a time-ordered ID and queues it for sync', () => {
    const repositories = createRepositories(createTestDatabase());

    const sighting = logSighting(
      repositories,
      { noradId: 25544, observedAt: NOW, verified: true, angleError: 4.2 },
      context,
    );

    expect(sighting.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    expect(repositories.sightings.getById(sighting.id)).toMatchObject({
      verified: true,
      angleError: 4.2,
      syncStatus: 'pending',
    });
    expect(repositories.outbox.count()).toBe(1);
  });

  test('stores an unverified "I saw it" sighting without an angle', () => {
    const repositories = createRepositories(createTestDatabase());

    const sighting = logSighting(
      repositories,
      { noradId: 25544, observedAt: NOW, verified: false, angleError: null },
      context,
    );

    expect(sighting).toMatchObject({ verified: false, angleError: null });
  });

  test('two sightings in the same millisecond get different IDs', () => {
    const repositories = createRepositories(createTestDatabase());
    const input = { noradId: 25544, observedAt: NOW, verified: true, angleError: 1 };

    const first = logSighting(repositories, input, context);
    const second = logSighting(repositories, input, context);

    expect(first.id).not.toBe(second.id);
  });
});
