import type { Database } from '../../database';
import { createTestDatabase } from '../../testing/createTestDatabase';
import { HUBBLE_NORAD_ID, ISS_NORAD_ID } from '../../testing/fixtures';
import { createSightingRepository } from '../sightingRepository';

const NOW = Date.UTC(2026, 10, 8, 21, 15);

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

function logIssSighting(id = '0193a6f0-0000-7000-8000-000000000001') {
  return createSightingRepository(db).log(
    { id, noradId: ISS_NORAD_ID, observedAt: NOW, verified: true, angleError: 4.2 },
    NOW,
  );
}

describe('sighting repository', () => {
  test('logging a sighting stores it without a note', () => {
    const sighting = logIssSighting();

    expect(sighting).toMatchObject({ noradId: ISS_NORAD_ID, angleError: 4.2, note: null });
    expect(createSightingRepository(db).getById(sighting.id)).toEqual(sighting);
  });

  test('logging the same id twice fails and keeps one sighting', () => {
    logIssSighting();

    expect(() => logIssSighting()).toThrow();
    expect(createSightingRepository(db).listAll()).toHaveLength(1);
  });

  test('updates a note', () => {
    const sightings = createSightingRepository(db);
    const { id } = logIssSighting();

    sightings.updateNote(id, 'Bright and fast', NOW + 1_000);

    expect(sightings.getById(id)?.note).toBe('Bright and fast');
  });

  test('updating the note of an unknown sighting throws', () => {
    expect(() => createSightingRepository(db).updateNote('missing', 'x', NOW)).toThrow(
      'Sighting missing not found',
    );
  });

  test('deletes a sighting', () => {
    const sightings = createSightingRepository(db);
    const { id } = logIssSighting();

    sightings.delete(id);

    expect(sightings.getById(id)).toBeUndefined();
  });

  test('deleting an unknown sighting throws', () => {
    expect(() => createSightingRepository(db).delete('missing')).toThrow(
      'Sighting missing not found',
    );
  });

  test('lists sightings newest first, optionally for one satellite', () => {
    const sightings = createSightingRepository(db);
    sightings.log({ id: 'a', noradId: ISS_NORAD_ID, observedAt: NOW, verified: true }, NOW);
    sightings.log({ id: 'b', noradId: HUBBLE_NORAD_ID, observedAt: NOW + 10, verified: true }, NOW);
    sightings.log({ id: 'c', noradId: ISS_NORAD_ID, observedAt: NOW + 20, verified: true }, NOW);

    expect(sightings.listAll().map((s) => s.id)).toEqual(['c', 'b', 'a']);
    expect(sightings.listForSatellite(ISS_NORAD_ID).map((s) => s.id)).toEqual(['c', 'a']);
  });
});
