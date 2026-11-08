import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { COLLECTION_SETS } from '@/domain/collectionSets';
import {
  CELESTRAK_GROUPS,
  OBJECT_TYPES,
  RARITIES,
  SYNC_STATUSES,
  type OmmRecord,
  type TrackPoint,
} from '@/domain/types';

export const satellites = sqliteTable('satellites', {
  noradId: integer('norad_id').primaryKey(),
  name: text('name').notNull(),
  objectType: text('object_type', { enum: OBJECT_TYPES }).notNull(),
  owner: text('owner').notNull(),
  launchDate: text('launch_date'),
  rarity: text('rarity', { enum: RARITIES }).notNull(),
  collectionSet: text('collection_set', { enum: COLLECTION_SETS })
    .notNull()
    .default('spiesAndSecrets'),
});

export const orbits = sqliteTable('orbits', {
  noradId: integer('norad_id').primaryKey(),
  group: text('group', { enum: CELESTRAK_GROUPS }).notNull(),
  omm: text('omm', { mode: 'json' }).$type<OmmRecord>().notNull(),
  epoch: integer('epoch').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
});

export const passes = sqliteTable(
  'passes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    noradId: integer('norad_id').notNull(),
    startAt: integer('start_at').notNull(),
    peakAt: integer('peak_at').notNull(),
    endAt: integer('end_at').notNull(),
    maxElevation: real('max_elevation').notNull(),
    peakMagnitude: real('peak_magnitude'),
    track: text('track', { mode: 'json' }).$type<TrackPoint[]>().notNull(),
  },
  (table) => [
    index('passes_start_at_idx').on(table.startAt),
    index('passes_norad_id_idx').on(table.noradId),
  ],
);

export const sightings = sqliteTable(
  'sightings',
  {
    id: text('id').primaryKey(),
    noradId: integer('norad_id').notNull(),
    observedAt: integer('observed_at').notNull(),
    verified: integer('verified', { mode: 'boolean' }).notNull(),
    angleError: real('angle_error'),
    note: text('note'),
    updatedAt: integer('updated_at').notNull(),
    syncStatus: text('sync_status', { enum: SYNC_STATUSES }).notNull().default('pending'),
  },
  (table) => [index('sightings_norad_id_idx').on(table.noradId)],
);

export const outbox = sqliteTable('outbox', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entity: text('entity', { enum: ['sighting'] }).notNull(),
  entityId: text('entity_id').notNull(),
  operation: text('operation', { enum: ['insert', 'update'] }).notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  attempts: integer('attempts').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Satellite = typeof satellites.$inferSelect;
export type NewSatellite = typeof satellites.$inferInsert;
export type Orbit = typeof orbits.$inferSelect;
export type NewOrbit = typeof orbits.$inferInsert;
export type Pass = typeof passes.$inferSelect;
export type NewPass = typeof passes.$inferInsert;
export type Sighting = typeof sightings.$inferSelect;
export type NewSighting = typeof sightings.$inferInsert;
export type OutboxEntry = typeof outbox.$inferSelect;
export type NewOutboxEntry = typeof outbox.$inferInsert;
