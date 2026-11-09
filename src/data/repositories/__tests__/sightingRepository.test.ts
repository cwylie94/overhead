import type { Database } from '../../database';
import type { Sighting } from '../../schema';
import { createTestDatabase } from '../../testing/createTestDatabase';
import { HUBBLE_NORAD_ID, ISS_NORAD_ID } from '../../testing/fixtures';
import { createSightingRepository } from '../sightingRepository';

const NOW = Date.UTC(2026, 10, 8, 21, 15);
const ISS_SIGHTING_ID = '0193a6f0-0000-7000-8000-000000000001';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

function logIssSighting(id = ISS_SIGHTING_ID) {
  return createSightingRepository(db).log({
    id,
    noradId: ISS_NORAD_ID,
    observedAt: NOW,
    angleError: 4.2,
  });
}

function outcomeOf(action: () => unknown): () => unknown {
  try {
    const value = action();
    return () => value;
  } catch (error) {
    return () => {
      throw error;
    };
  }
}

describe('createSightingRepository', () => {
  describe('given an empty database', () => {
    describe('when the user logs a sighting', () => {
      let sighting: Sighting;

      beforeEach(() => {
        sighting = logIssSighting();
      });

      test('then it is stored without a note', () => {
        expect(sighting).toMatchObject({ noradId: ISS_NORAD_ID, angleError: 4.2, note: null });
      });

      test('then it reads back by its id', () => {
        expect(createSightingRepository(db).getById(sighting.id)).toEqual(sighting);
      });
    });

    describe('when the user updates the note of an unknown sighting', () => {
      let outcome: () => unknown;

      beforeEach(() => {
        outcome = outcomeOf(() => createSightingRepository(db).updateNote('missing', 'x'));
      });

      test('then it fails because the sighting is not found', () => {
        expect(outcome).toThrow('Sighting missing not found');
      });
    });

    describe('when the user deletes an unknown sighting', () => {
      let outcome: () => unknown;

      beforeEach(() => {
        outcome = outcomeOf(() => createSightingRepository(db).delete('missing'));
      });

      test('then it fails because the sighting is not found', () => {
        expect(outcome).toThrow('Sighting missing not found');
      });
    });
  });

  describe('given a logged sighting', () => {
    beforeEach(() => {
      logIssSighting();
    });

    describe('when a sighting with the same id is logged', () => {
      let outcome: () => unknown;

      beforeEach(() => {
        outcome = outcomeOf(() => logIssSighting());
      });

      test('then it fails', () => {
        expect(outcome).toThrow();
      });

      test('then it keeps one sighting', () => {
        expect(createSightingRepository(db).listAll()).toHaveLength(1);
      });
    });

    describe('when the user updates its note', () => {
      beforeEach(() => {
        createSightingRepository(db).updateNote(ISS_SIGHTING_ID, 'Bright and fast');
      });

      test('then it has the new note', () => {
        expect(createSightingRepository(db).getById(ISS_SIGHTING_ID)?.note).toBe('Bright and fast');
      });
    });

    describe('when the user deletes it', () => {
      beforeEach(() => {
        createSightingRepository(db).delete(ISS_SIGHTING_ID);
      });

      test('then it is gone', () => {
        expect(createSightingRepository(db).getById(ISS_SIGHTING_ID)).toBeUndefined();
      });
    });
  });

  describe('given sightings of the ISS, then Hubble, then the ISS again', () => {
    beforeEach(() => {
      const sightings = createSightingRepository(db);
      sightings.log({ id: 'a', noradId: ISS_NORAD_ID, observedAt: NOW });
      sightings.log({ id: 'b', noradId: HUBBLE_NORAD_ID, observedAt: NOW + 10 });
      sightings.log({ id: 'c', noradId: ISS_NORAD_ID, observedAt: NOW + 20 });
    });

    test('then it lists them all newest first', () => {
      expect(
        createSightingRepository(db)
          .listAll()
          .map((s) => s.id),
      ).toEqual(['c', 'b', 'a']);
    });

    test('then it lists one satellite’s sightings newest first', () => {
      expect(
        createSightingRepository(db)
          .listForSatellite(ISS_NORAD_ID)
          .map((s) => s.id),
      ).toEqual(['c', 'a']);
    });
  });
});
