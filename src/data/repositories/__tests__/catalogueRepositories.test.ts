import type { Database } from '../../database';
import { createTestDatabase } from '../../testing/createTestDatabase';
import {
  HUBBLE_NORAD_ID,
  ISS_NORAD_ID,
  makeOrbit,
  makePass,
  makeSatellite,
} from '../../testing/fixtures';
import { createOrbitRepository } from '../orbitRepository';
import { createPassRepository } from '../passRepository';
import { createSatelliteRepository } from '../satelliteRepository';
import { createSyncMetaRepository } from '../syncMetaRepository';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('satellite repository', () => {
  test('upserts satellites and lists them by name', () => {
    const satellites = createSatelliteRepository(db);

    satellites.upsertMany([
      makeSatellite(),
      makeSatellite({ noradId: HUBBLE_NORAD_ID, name: 'HST', rarity: 'uncommon' }),
    ]);
    satellites.upsertMany([makeSatellite({ rarity: 'rare' })]);

    expect(satellites.listAll().map((s) => s.name)).toEqual(['HST', 'ISS (ZARYA)']);
    expect(satellites.getById(ISS_NORAD_ID)?.rarity).toBe('rare');
  });

  test('handles more rows than fit in one insert statement', () => {
    const satellites = createSatelliteRepository(db);
    const rows = Array.from({ length: 450 }, (_, i) =>
      makeSatellite({ noradId: 10_000 + i, name: `SAT ${i}` }),
    );

    satellites.upsertMany(rows);

    expect(satellites.listAll()).toHaveLength(450);
  });
});

describe('orbit repository', () => {
  test('replaces only the rows of the refreshed group', () => {
    const orbits = createOrbitRepository(db);
    orbits.replaceGroup('stations', [makeOrbit()]);
    orbits.replaceGroup('visual', [makeOrbit({ noradId: HUBBLE_NORAD_ID, group: 'visual' })]);

    orbits.replaceGroup('visual', [
      makeOrbit({ noradId: HUBBLE_NORAD_ID, group: 'visual', epoch: 2 }),
    ]);

    expect(orbits.listAll()).toHaveLength(2);
    expect(orbits.getById(HUBBLE_NORAD_ID)?.epoch).toBe(2);
    expect(orbits.getById(ISS_NORAD_ID)?.group).toBe('stations');
  });

  test('round-trips the OMM JSON', () => {
    const orbits = createOrbitRepository(db);
    const orbit = makeOrbit();

    orbits.replaceGroup('stations', [orbit]);

    expect(orbits.getById(ISS_NORAD_ID)?.omm).toEqual(orbit.omm);
  });
});

describe('pass repository', () => {
  const evening = Date.UTC(2026, 10, 8, 18);
  const morning = Date.UTC(2026, 10, 9, 6);

  test('lists passes overlapping a window in start order', () => {
    const passes = createPassRepository(db);
    passes.replaceAll([
      makePass({ startAt: Date.UTC(2026, 10, 8, 22) }),
      makePass({ startAt: Date.UTC(2026, 10, 8, 19), noradId: HUBBLE_NORAD_ID }),
      makePass({ startAt: Date.UTC(2026, 10, 9, 12) }),
    ]);

    const tonight = passes.listBetween(evening, morning);

    expect(tonight.map((p) => p.noradId)).toEqual([HUBBLE_NORAD_ID, ISS_NORAD_ID]);
    expect(tonight[1]?.track).toHaveLength(3);
  });

  test('replaceAll drops previously cached passes', () => {
    const passes = createPassRepository(db);
    passes.replaceAll([makePass(), makePass({ startAt: Date.UTC(2026, 10, 8, 23) })]);

    passes.replaceAll([makePass({ startAt: Date.UTC(2026, 10, 8, 20) })]);

    expect(passes.listBetween(evening, morning)).toHaveLength(1);
  });

  test('finds the next pass for a satellite, including one in progress', () => {
    const passes = createPassRepository(db);
    const first = Date.UTC(2026, 10, 8, 21, 12);
    passes.replaceAll([makePass({ startAt: first }), makePass({ startAt: first + 5_400_000 })]);

    expect(passes.nextForSatellite(ISS_NORAD_ID, first + 60_000)?.startAt).toBe(first);
    expect(passes.nextForSatellite(ISS_NORAD_ID, first + 600_000)?.startAt).toBe(first + 5_400_000);
    expect(passes.nextForSatellite(HUBBLE_NORAD_ID, first)).toBeUndefined();
  });
});

describe('sync meta repository', () => {
  test('stores and overwrites values by key', () => {
    const syncMeta = createSyncMetaRepository(db);

    expect(syncMeta.get('pullCursor')).toBeUndefined();
    syncMeta.set('pullCursor', '10');
    syncMeta.set('pullCursor', '42');

    expect(syncMeta.get('pullCursor')).toBe('42');
  });
});
