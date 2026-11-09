import { createRepositories } from '../../repositories';
import type { Repositories } from '../../repositories/types';
import type { Sighting } from '../../schema';
import { createTestDatabase } from '../../testing/createTestDatabase';
import { logSighting } from '../logSighting';

const NOW = Date.UTC(2026, 10, 8, 21, 14);
let counter = 0;
const context = {
  now: NOW,
  randomBytes: (count: number) => new Uint8Array(count).fill(++counter),
};

describe('logSighting', () => {
  describe('given an empty database', () => {
    let repositories: Repositories;

    beforeEach(() => {
      repositories = createRepositories(createTestDatabase());
    });

    describe('when the user logs a catch', () => {
      let sighting: Sighting;

      beforeEach(() => {
        sighting = logSighting(
          repositories,
          { noradId: 25544, observedAt: NOW, angleError: 4.2 },
          context,
        );
      });

      test('then the catch gets a time-ordered ID', () => {
        expect(sighting.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
      });

      test('then the catch is stored', () => {
        expect(repositories.sightings.getById(sighting.id)).toMatchObject({
          noradId: 25544,
          angleError: 4.2,
        });
      });
    });

    describe('when the user logs two catches in the same millisecond', () => {
      let first: Sighting;
      let second: Sighting;

      beforeEach(() => {
        const input = { noradId: 25544, observedAt: NOW, angleError: 1 };
        first = logSighting(repositories, input, context);
        second = logSighting(repositories, input, context);
      });

      test('then they get different IDs', () => {
        expect(first.id).not.toBe(second.id);
      });
    });
  });
});
