import { and, asc, desc, eq, gt, isNotNull, lt, lte, max } from 'drizzle-orm';

import { NAKED_EYE_LIMIT } from '@/domain/brightness';

import type { Database } from './database';
import { orbits, passes, satellites, sightings } from './schema';

const passSummary = {
  id: passes.id,
  noradId: passes.noradId,
  startAt: passes.startAt,
  peakAt: passes.peakAt,
  endAt: passes.endAt,
  maxElevation: passes.maxElevation,
  peakMagnitude: passes.peakMagnitude,
  name: satellites.name,
  rarity: satellites.rarity,
};

const passWithSatellite = { ...passSummary, track: passes.track };

function isUpcoming(now: number) {
  return and(gt(passes.endAt, now), lte(passes.peakMagnitude, NAKED_EYE_LIMIT));
}

export function upcomingPassesQuery(db: Database, now: number) {
  return db
    .select(passWithSatellite)
    .from(passes)
    .innerJoin(satellites, eq(passes.noradId, satellites.noradId))
    .where(isUpcoming(now))
    .orderBy(asc(passes.startAt));
}

export function upcomingPassSummariesQuery(db: Database, now: number) {
  return db
    .select(passSummary)
    .from(passes)
    .innerJoin(satellites, eq(passes.noradId, satellites.noradId))
    .where(isUpcoming(now))
    .orderBy(asc(passes.startAt));
}

export type UpcomingPass = Awaited<ReturnType<typeof upcomingPassesQuery>>[number];
export type PassSummary = Awaited<ReturnType<typeof upcomingPassSummariesQuery>>[number];

export function orbitFreshnessQuery(db: Database) {
  return db
    .select({ group: orbits.group, fetchedAt: max(orbits.fetchedAt) })
    .from(orbits)
    .groupBy(orbits.group);
}

export function dockedObjectsQuery(db: Database) {
  return db.select({ noradId: orbits.noradId }).from(orbits).where(isNotNull(orbits.dockedTo));
}

export function skyPassesQuery(db: Database, from: number, to: number) {
  return db
    .select(passWithSatellite)
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

export function passWithSatelliteQuery(db: Database, id: number) {
  return db
    .select(passWithSatellite)
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

export function satelliteQuery(db: Database, noradId: number) {
  return db
    .select({
      noradId: satellites.noradId,
      name: satellites.name,
      objectType: satellites.objectType,
      owner: satellites.owner,
      launchDate: satellites.launchDate,
      rarity: satellites.rarity,
      collectionSet: satellites.collectionSet,
    })
    .from(satellites)
    .where(eq(satellites.noradId, noradId));
}

export type SatelliteDetail = Awaited<ReturnType<typeof satelliteQuery>>[number];

export function satelliteOrbitQuery(db: Database, noradId: number) {
  return db
    .select({ omm: orbits.omm, hostId: orbits.dockedTo, hostName: satellites.name })
    .from(orbits)
    .leftJoin(satellites, eq(satellites.noradId, orbits.dockedTo))
    .where(eq(orbits.noradId, noradId));
}

export function nextPassQuery(db: Database, noradId: number, after: number) {
  return db
    .select({ startAt: passes.startAt })
    .from(passes)
    .where(and(eq(passes.noradId, noradId), gt(passes.endAt, after)))
    .orderBy(asc(passes.startAt))
    .limit(1);
}
