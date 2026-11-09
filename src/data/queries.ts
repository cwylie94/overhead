import { and, asc, count, desc, eq, gt, lt, lte, max } from 'drizzle-orm';

import { NAKED_EYE_LIMIT } from '@/domain/brightness';

import type { Database } from './database';
import { orbits, outbox, passes, satellites, sightings } from './schema';

export function upcomingPassesQuery(db: Database, now: number) {
  return db
    .select({
      id: passes.id,
      noradId: passes.noradId,
      startAt: passes.startAt,
      peakAt: passes.peakAt,
      endAt: passes.endAt,
      maxElevation: passes.maxElevation,
      peakMagnitude: passes.peakMagnitude,
      track: passes.track,
      name: satellites.name,
      rarity: satellites.rarity,
    })
    .from(passes)
    .innerJoin(satellites, eq(passes.noradId, satellites.noradId))
    .where(and(gt(passes.endAt, now), lte(passes.peakMagnitude, NAKED_EYE_LIMIT)))
    .orderBy(asc(passes.startAt));
}

export type UpcomingPass = Awaited<ReturnType<typeof upcomingPassesQuery>>[number];

export function orbitFreshnessQuery(db: Database) {
  return db
    .select({ group: orbits.group, fetchedAt: max(orbits.fetchedAt) })
    .from(orbits)
    .groupBy(orbits.group);
}

export function orbitElementsQuery(db: Database) {
  return db.select({ omm: orbits.omm }).from(orbits);
}

export function skyPassesQuery(db: Database, from: number, to: number) {
  return db
    .select({
      id: passes.id,
      noradId: passes.noradId,
      startAt: passes.startAt,
      endAt: passes.endAt,
      maxElevation: passes.maxElevation,
      peakMagnitude: passes.peakMagnitude,
      track: passes.track,
      name: satellites.name,
      rarity: satellites.rarity,
    })
    .from(passes)
    .innerJoin(satellites, eq(passes.noradId, satellites.noradId))
    .where(
      and(
        gt(passes.endAt, from),
        lt(passes.startAt, to),
        lte(passes.peakMagnitude, NAKED_EYE_LIMIT),
      ),
    )
    .orderBy(asc(passes.startAt));
}

export type SkyPass = Awaited<ReturnType<typeof skyPassesQuery>>[number];

export function passWithSatelliteQuery(db: Database, id: number) {
  return db
    .select({
      id: passes.id,
      noradId: passes.noradId,
      startAt: passes.startAt,
      peakAt: passes.peakAt,
      endAt: passes.endAt,
      maxElevation: passes.maxElevation,
      peakMagnitude: passes.peakMagnitude,
      track: passes.track,
      name: satellites.name,
      rarity: satellites.rarity,
    })
    .from(passes)
    .innerJoin(satellites, eq(passes.noradId, satellites.noradId))
    .where(eq(passes.id, id));
}

export function collectableSatellitesQuery(db: Database) {
  return db
    .select({
      noradId: satellites.noradId,
      name: satellites.name,
      objectType: satellites.objectType,
      rarity: satellites.rarity,
      collectionSet: satellites.collectionSet,
    })
    .from(satellites);
}

export function sightingRecordsQuery(db: Database) {
  return db
    .select({
      noradId: sightings.noradId,
      observedAt: sightings.observedAt,
    })
    .from(sightings);
}

export function satelliteSightingsQuery(db: Database, noradId: number) {
  return db
    .select()
    .from(sightings)
    .where(eq(sightings.noradId, noradId))
    .orderBy(desc(sightings.observedAt));
}

export function pendingChangesQuery(db: Database) {
  return db.select({ value: count() }).from(outbox);
}
