import { sql } from 'drizzle-orm';

import type { Database } from '../../database';
import { outbox } from '../../schema';
import { createTestDatabase } from '../../testing/createTestDatabase';
import { HUBBLE_NORAD_ID, ISS_NORAD_ID } from '../../testing/fixtures';
import { createOutboxRepository } from '../outboxRepository';
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
  test('logging a sighting writes the row and an outbox entry together', () => {
    const sighting = logIssSighting();

    expect(sighting).toMatchObject({ syncStatus: 'pending', updatedAt: NOW, note: null });

    const entries = createOutboxRepository(db).listPending(10);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      entity: 'sighting',
      entityId: sighting.id,
      operation: 'insert',
      attempts: 0,
    });
    expect(entries[0]?.payload).toMatchObject({ id: sighting.id, verified: true });
  });

  test('a failed outbox write rolls back the sighting', () => {
    db.run(sql`DROP TABLE ${outbox}`);

    expect(() => logIssSighting()).toThrow();
    expect(createSightingRepository(db).listAll()).toEqual([]);
  });

  test('logging the same id twice fails without a second outbox entry', () => {
    logIssSighting();

    expect(() => logIssSighting()).toThrow();
    expect(createOutboxRepository(db).count()).toBe(1);
  });

  test('updating a note marks the sighting pending and queues an update', () => {
    const sightings = createSightingRepository(db);
    const { id } = logIssSighting();
    sightings.markSynced([id]);

    sightings.updateNote(id, 'Bright and fast', NOW + 1_000);

    expect(sightings.getById(id)).toMatchObject({
      note: 'Bright and fast',
      updatedAt: NOW + 1_000,
      syncStatus: 'pending',
    });
    const update = createOutboxRepository(db).listPending(10)[1];
    expect(update).toMatchObject({ operation: 'update', entityId: id });
    expect(update?.payload).toEqual({ id, note: 'Bright and fast', updatedAt: NOW + 1_000 });
  });

  test('updating the note of an unknown sighting throws and queues nothing', () => {
    expect(() => createSightingRepository(db).updateNote('missing', 'x', NOW)).toThrow(
      'Sighting missing not found',
    );
    expect(createOutboxRepository(db).count()).toBe(0);
  });

  test('lists sightings newest first, optionally for one satellite', () => {
    const sightings = createSightingRepository(db);
    sightings.log({ id: 'a', noradId: ISS_NORAD_ID, observedAt: NOW, verified: true }, NOW);
    sightings.log(
      { id: 'b', noradId: HUBBLE_NORAD_ID, observedAt: NOW + 10, verified: false },
      NOW,
    );
    sightings.log({ id: 'c', noradId: ISS_NORAD_ID, observedAt: NOW + 20, verified: true }, NOW);

    expect(sightings.listAll().map((s) => s.id)).toEqual(['c', 'b', 'a']);
    expect(sightings.listForSatellite(ISS_NORAD_ID).map((s) => s.id)).toEqual(['c', 'a']);
  });
});

describe('outbox repository', () => {
  test('lists entries oldest first, counts attempts and removes confirmed ones', () => {
    const outboxRepository = createOutboxRepository(db);
    logIssSighting('a');
    logIssSighting('b');
    const [first, second] = outboxRepository.listPending(10);

    outboxRepository.recordAttempt([first!.id, second!.id]);
    outboxRepository.recordAttempt([second!.id]);
    outboxRepository.remove([first!.id]);

    const remaining = outboxRepository.listPending(10);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ entityId: 'b', attempts: 2 });
    expect(outboxRepository.count()).toBe(1);
  });

  test('respects the batch limit', () => {
    ['a', 'b', 'c'].forEach((id) => logIssSighting(id));

    expect(
      createOutboxRepository(db)
        .listPending(2)
        .map((e) => e.entityId),
    ).toEqual(['a', 'b']);
  });
});
