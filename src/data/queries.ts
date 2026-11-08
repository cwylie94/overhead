import { and, asc, eq, gt, lt, lte, max } from 'drizzle-orm';

import { NAKED_EYE_LIMIT } from '@/domain/brightness';

import type { Database } from './database';
import { orbits, passes, satellites } from './schema';

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
